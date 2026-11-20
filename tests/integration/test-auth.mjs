import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
const base = "http://127.0.0.1:" + (Number(process.env.AUTH_TEST_PORT) || 5177);
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
assert.ok(email && password, "Temporary local admin credentials required");
const studentEmail = "student-" + email;
async function request(path, body, cookie = "", method = body ? "POST" : "GET", origin = base) {
  return fetch(base + path, {
    method,
    redirect: "manual",
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const credentials = { email, password };
assert.equal((await request("/projects/project-fullstack-web")).status, 302);
assert.equal((await request("/api/session")).status, 200);
assert.ok(!(await (await request("/api/session")).json()).user);
assert.ok(!(await request("/api/auth/sign-up/email", { ...credentials, name: "Test" })).ok);
assert.ok(
  !(await request("/api/auth/sign-in/email", { email, password: "incorrect-password" })).ok,
);
const login = await request("/api/auth/sign-in/email", credentials);
assert.equal(login.status, 200, await login.clone().text());
const cookies = login.headers.getSetCookie();
assert.ok(cookies.some((c) => /HttpOnly/i.test(c)));
const adminCookie = cookies.map((c) => c.split(";")[0]).join("; ");
assert.equal((await request("/admin", null, adminCookie)).status, 200);
const studentPassword = String(randomInt(10000000, 100000000));
const newPassword = studentPassword.repeat(2);
const student = {
  email: studentEmail,
  password: studentPassword,
  name: "Test Student",
  role: "user",
};
for (const invalidPassword of [studentPassword.slice(1), newPassword + "a"]) {
  assert.equal(
    (
      await request(
        "/api/auth/admin/create-user",
        { ...student, password: invalidPassword },
        adminCookie,
      )
    ).status,
    400,
  );
}
const created = await request("/api/auth/admin/create-user", student, adminCookie);
assert.equal(created.status, 200, await created.clone().text());
const studentLogin = await request("/api/auth/sign-in/email", student);
assert.equal(studentLogin.status, 200);
const studentCookie = studentLogin.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
assert.equal((await request("/projects/project-fullstack-web", null, studentCookie)).status, 200);
assert.equal((await request("/projects/missing", null, studentCookie)).status, 404);
assert.equal((await request("/admin", null, studentCookie)).status, 403);
assert.ok(
  !(
    await request(
      "/api/auth/admin/create-user",
      { ...student, email: "forged-" + email, role: "admin" },
      studentCookie,
    )
  ).ok,
);
assert.ok(
  !(
    await request(
      "/api/auth/admin/set-role",
      {
        userId: (await (await request("/api/auth/get-session", null, studentCookie)).json()).user
          .id,
        role: "admin",
      },
      studentCookie,
    )
  ).ok,
);
assert.ok(
  !(
    await request(
      "/api/auth/admin/create-user",
      { ...student, email: "csrf-" + email },
      adminCookie,
      "POST",
      "https://untrusted.example",
    )
  ).ok,
);
const projectInput = {
  codeName: "TEST-" + Date.now(),
  title: "Integration project",
  points: 100,
  dueDate: "2026-12-20T23:59",
  tags: "React,D1",
  content: "# Test",
};
assert.equal((await request("/api/projects")).status, 401);
assert.equal((await request("/api/projects", projectInput, studentCookie)).status, 403);
assert.ok(
  !(await request("/api/projects", projectInput, adminCookie, "POST", "https://untrusted.example"))
    .ok,
);
assert.equal(
  (await request("/api/projects", { ...projectInput, points: -1 }, adminCookie)).status,
  400,
);
assert.equal(
  (await request("/api/projects", { ...projectInput, codeName: "PROJ-01" }, adminCookie)).status,
  409,
);
const upload = new FormData();
for (const [key, value] of Object.entries(projectInput)) upload.set(key, String(value));
const fileContents = "題目附件".repeat(60000);
upload.append("attachments", new Blob([fileContents]), "試題.txt");
const createdProjectResponse = await fetch(base + "/api/projects", {
  method: "POST",
  headers: { Origin: base, Cookie: adminCookie },
  body: upload,
});
assert.equal(createdProjectResponse.status, 201, await createdProjectResponse.clone().text());
const { project } = await createdProjectResponse.json();
writeFileSync(".void/crud-project-ids.json", JSON.stringify([project.id]));
assert.equal(project.title, projectInput.title);
assert.equal(project.attachments.length, 1);
const attachmentPath = "/api/projects/" + project.id + "/attachments/" + project.attachments[0].id;
assert.equal((await request(attachmentPath)).status, 401);
const downloaded = await request(attachmentPath, null, studentCookie);
assert.equal(downloaded.status, 200);
assert.equal(await downloaded.text(), fileContents);
assert.equal((await request("/api/projects", projectInput, adminCookie)).status, 409);
const list = await (await request("/api/projects", null, studentCookie)).json();
assert.ok(list.projects.some((item) => item.id === project.id));
assert.equal((await request("/projects/" + project.id, null, studentCookie)).status, 200);
// Keep a student's work while replacing a handout on the teacher's assignment.
const projectPath = "/api/projects/" + project.id;
const workspacePath = projectPath + "/workspace";
const initialWorkspace = await (await request(workspacePath, null, studentCookie)).json();
assert.equal(initialWorkspace.draft, null);
const draft = {
  designDoc: "# My README",
  repoUrl: "student/work",
  model: {
    format: "codepulse-c4",
    version: 1,
    relationships: [],
    nodes: [
      {
        id: "system",
        kind: "system",
        category: "system",
        label: "Student system",
        description: "",
        expectedPath: "",
        technology: "",
        parentId: null,
        x: 0,
        y: 0,
      },
    ],
  },
};
const saved = await fetch(base + workspacePath, {
  method: "PUT",
  headers: {
    Origin: base,
    Cookie: studentCookie,
    "X-Workspace-Account": initialWorkspace.accountId,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ revision: null, draft }),
});
assert.equal(saved.status, 200);
upload.delete("attachments");
upload.set("content", "# New instructions");
upload.append("attachments", project.attachments[0].id);
upload.append("attachments", new Blob(["new handout"]), "handout.txt");
const patchFiles = () =>
  fetch(base + projectPath, {
    method: "PATCH",
    headers: { Origin: base, Cookie: adminCookie },
    body: upload,
  });
const added = await patchFiles();
assert.equal(added.status, 200);
const withHandout = (await added.json()).project;
assert.equal(withHandout.attachments.length, 2);
assert.deepEqual((await (await request(workspacePath, null, studentCookie)).json()).draft, draft);
upload.delete("attachments");
upload.append("attachments", project.attachments[0].id);
const removed = await patchFiles();
assert.equal(removed.status, 200);
assert.deepEqual((await removed.json()).project.attachments, project.attachments);
const removedFile = withHandout.attachments.find((file) => file.name === "handout.txt");
assert.equal(
  (await request(projectPath + "/attachments/" + removedFile.id, null, studentCookie)).status,
  404,
);
console.log(
  "Passed project creation, validation, duplicate conflict, student read, deep links, and admin-only writes.",
);
assert.equal((await request("/api/auth/sign-out", {}, studentCookie)).status, 200);
assert.equal((await (await request("/api/session", null, studentCookie)).json()).user, null);
assert.equal((await request("/projects/project-fullstack-web", null, studentCookie)).status, 302);
console.log(
  "Passed: sign-up disabled, incorrect password, session restore, HttpOnly cookie, protected projects, admin create, student access, privilege escalation denied, cross-origin denied, logout revocation.",
);

// Management CRUD, with no mutations to pre-existing accounts or built-in projects.
const accountList = await request("/api/admin/accounts", null, adminCookie);
assert.equal(accountList.status, 200);
const accountData = await accountList.json();
const studentId = accountData.users.find((user) => user.email === studentEmail).id;
const adminId = accountData.currentUserId;
assert.ok(accountData.users.every((user) => !("password" in user) && !("token" in user)));
assert.equal((await request("/api/admin/accounts")).status, 401);
const relogin = await request("/api/auth/sign-in/email", student);
assert.equal(relogin.status, 200);
const currentStudentCookie = relogin.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
assert.equal((await request("/api/admin/accounts", null, currentStudentCookie)).status, 403);
const accountUpdate = { name: "Updated student", email: "edited-" + studentEmail, role: "user" };
const profilePath = "/api/admin/accounts/" + studentId;
const passwordPath = profilePath + "/password";
const passwordUpdate = { currentPassword: studentPassword, newPassword };
// Each operation rejects a combined submission before applying either change.
for (const path of [profilePath, passwordPath]) {
  assert.equal(
    (await request(path, { ...accountUpdate, ...passwordUpdate }, adminCookie, "PATCH")).status,
    400,
  );
}
assert.equal(
  (await request(passwordPath, passwordUpdate, currentStudentCookie, "PATCH")).status,
  403,
);
for (const invalidPassword of [studentPassword.slice(1), newPassword + "a"]) {
  assert.equal(
    (
      await request(
        passwordPath,
        { ...passwordUpdate, newPassword: invalidPassword },
        adminCookie,
        "PATCH",
      )
    ).status,
    400,
  );
}
for (const currentPassword of [undefined, "", "wrong-password"]) {
  const rejected = await request(
    passwordPath,
    { ...passwordUpdate, currentPassword },
    adminCookie,
    "PATCH",
  );
  assert.equal(rejected.status, 400);
  assert.equal((await rejected.json()).error, "invalidCurrentPassword");
}
assert.equal(
  (await (await request("/api/session", null, currentStudentCookie)).json()).user.studentId,
  studentEmail,
);
assert.ok(
  !(
    await request(
      "/api/auth/admin/set-user-password",
      { userId: studentId, newPassword },
      adminCookie,
    )
  ).ok,
);
assert.equal(
  (await request("/api/admin/accounts/" + studentId, accountUpdate, currentStudentCookie, "PATCH"))
    .status,
  403,
);
assert.equal(
  (await request("/api/admin/accounts/" + studentId, null, currentStudentCookie, "DELETE")).status,
  403,
);
assert.equal(
  (await request("/api/admin/accounts/" + adminId, null, adminCookie, "DELETE")).status,
  409,
);
assert.equal(
  (
    await request(
      "/api/admin/accounts/" + adminId,
      { name: "Admin", email, role: "user" },
      adminCookie,
      "PATCH",
    )
  ).status,
  409,
);
assert.equal(
  (
    await request(
      "/api/admin/accounts/" + studentId,
      { ...accountUpdate, email },
      adminCookie,
      "PATCH",
    )
  ).status,
  409,
);
assert.ok(
  !(
    await request(
      "/api/auth/admin/update-user",
      { userId: studentId, data: { role: "admin" } },
      adminCookie,
    )
  ).ok,
);
const changedAccount = await request(
  "/api/admin/accounts/" + studentId,
  accountUpdate,
  adminCookie,
  "PATCH",
);
assert.equal(changedAccount.status, 200, await changedAccount.clone().text());
assert.equal((await (await request("/api/session", null, currentStudentCookie)).json()).user, null);
const editedLogin = await request("/api/auth/sign-in/email", {
  email: accountUpdate.email,
  password: studentPassword,
});
assert.equal(editedLogin.status, 200, await editedLogin.clone().text());
const editedCookie = editedLogin.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
const changePassword = () => request(passwordPath, passwordUpdate, adminCookie, "PATCH");
const attempts = await Promise.all([changePassword(), changePassword()]);
assert.equal(attempts.filter((r) => r.status === 200).length, 1);
assert.ok(attempts.some((r) => r.status === 400 || r.status === 409));
const profiles = await (await request("/api/admin/accounts", null, adminCookie)).json();
const edited = profiles.users.find((user) => user.id === studentId);
assert.deepEqual({ name: edited.name, email: edited.email, role: edited.role }, accountUpdate);
assert.equal((await (await request("/api/session", null, editedCookie)).json()).user, null);
assert.ok(
  !(
    await request("/api/auth/sign-in/email", {
      email: accountUpdate.email,
      password: studentPassword,
    })
  ).ok,
);
const editedProject = { ...projectInput, title: "Updated project", content: "# Updated" };
assert.equal(
  (await request("/api/projects/" + project.id, editedProject, editedCookie, "PATCH")).status,
  401,
);
const projectUpdate = await request(
  "/api/projects/" + project.id,
  editedProject,
  adminCookie,
  "PATCH",
);
assert.equal(projectUpdate.status, 200, await projectUpdate.clone().text());
const updated = (await projectUpdate.json()).project;
assert.equal(updated.content, editedProject.content);
assert.deepEqual(updated.attachments, project.attachments);
const updatedList = await (await request("/api/projects?locale=zh-TW", null, adminCookie)).json();
assert.equal(updatedList.projects.find((item) => item.id === project.id).title, "Updated project");
assert.ok(updatedList.projects.some((item) => item.id === "project-fullstack-web"));
assert.equal(
  (
    await request(
      "/api/projects/" + project.id,
      { ...editedProject, codeName: "PROJ-01" },
      adminCookie,
      "PATCH",
    )
  ).status,
  409,
);
assert.equal(
  (await request("/api/projects/" + project.id, null, adminCookie, "DELETE")).status,
  200,
);
assert.equal((await request("/projects/" + project.id, null, adminCookie)).status, 404);
assert.equal((await request(attachmentPath, null, adminCookie)).status, 404);
assert.ok(
  !(await (await request("/api/projects", null, adminCookie)).json()).projects.some(
    (item) => item.id === project.id,
  ),
);
assert.equal(
  (await request("/api/projects/" + project.id, editedProject, adminCookie, "PATCH")).status,
  404,
);
const lastLogin = await request("/api/auth/sign-in/email", {
  email: accountUpdate.email,
  password: newPassword,
});
assert.equal(lastLogin.status, 200);
const lastCookie = lastLogin.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
const ownProfile = { name: "Personal profile", email: "self-" + studentEmail };
const patchOwnProfile = (body) => request("/api/account", body, lastCookie, "PATCH");
assert.equal((await request("/api/account", ownProfile, "", "PATCH")).status, 401);
const crossOriginEdit = await request(
  "/api/account",
  ownProfile,
  lastCookie,
  "PATCH",
  "https://untrusted.example",
);
assert.ok([401, 403].includes(crossOriginEdit.status));
assert.equal((await patchOwnProfile({ ...ownProfile, id: adminId })).status, 400);
assert.equal((await patchOwnProfile({ ...ownProfile, role: "admin" })).status, 400);
assert.equal((await patchOwnProfile({ ...ownProfile, email })).status, 409);
assert.equal((await (await patchOwnProfile(ownProfile)).json()).signedOut, true);
assert.equal((await (await request("/api/session", null, lastCookie)).json()).user, null);

async function signInToEditedAccount(password) {
  const response = await request("/api/auth/sign-in/email", { email: ownProfile.email, password });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
const ownCookie = await signInToEditedAccount(newPassword);
const ownSession = await (await request("/api/session", null, ownCookie)).json();
assert.deepEqual(ownSession.user, {
  id: studentId,
  name: ownProfile.name,
  studentId: ownProfile.email,
  role: "user",
});
const patchOwnPassword = (currentPassword) =>
  request(
    "/api/account/password",
    { currentPassword, newPassword: studentPassword },
    ownCookie,
    "PATCH",
  );
assert.equal((await patchOwnPassword("wrong-password")).status, 400);
assert.equal((await (await patchOwnPassword(newPassword)).json()).signedOut, true);
assert.equal((await (await request("/api/session", null, ownCookie)).json()).user, null);
await signInToEditedAccount(studentPassword);
assert.equal(
  (await request(profilePath, { ...ownProfile, role: "admin" }, adminCookie, "PATCH")).status,
  200,
);
const promotedCookie = await signInToEditedAccount(studentPassword);
assert.equal(
  (await request("/api/admin/accounts/" + studentId, null, adminCookie, "DELETE")).status,
  200,
);
assert.equal((await (await request("/api/session", null, promotedCookie)).json()).user, null);
assert.ok(
  !(
    await request("/api/auth/sign-in/email", { email: ownProfile.email, password: studentPassword })
  ).ok,
);
assert.ok(
  !(await (await request("/api/admin/accounts", null, adminCookie)).json()).users.some(
    (user) => user.id === studentId,
  ),
);
console.log(
  "Passed management lists, project edit/delete, account edit/role/delete, duplicate email, self protection, session revocation and disabled bypass endpoints.",
);
