import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
const base = "http://127.0.0.1:5177";
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
  summary: "Project creation integration test",
  points: 100,
  dueDate: "2026-12-20T23:59",
  defaultRepoUrl: "",
  tags: "React,D1",
  requirements: "One requirement",
  initialDesignDoc: "# Test",
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
const createdProjectResponse = await request("/api/projects", projectInput, adminCookie);
assert.equal(createdProjectResponse.status, 201, await createdProjectResponse.clone().text());
const { project } = await createdProjectResponse.json();
writeFileSync(".void/crud-project-ids.json", JSON.stringify([project.id]));
assert.equal(project.title, projectInput.title);
assert.equal((await request("/api/projects", projectInput, adminCookie)).status, 409);
const list = await (await request("/api/projects", null, studentCookie)).json();
assert.ok(list.projects.some((item) => item.id === project.id));
assert.equal((await request("/projects/" + project.id, null, studentCookie)).status, 200);
assert.equal((await request("/projects/" + project.id, null, studentCookie)).status, 200);
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
assert.equal(
  (await request(profilePath, { ...accountUpdate, role: "admin" }, adminCookie, "PATCH")).status,
  200,
);
const editedProject = { ...projectInput, title: "Updated project", initialDesignDoc: "# Updated" };
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
assert.deepEqual(
  (await projectUpdate.json()).project.initialMindMapNodes,
  project.initialMindMapNodes,
);
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
assert.equal(
  (await request("/api/admin/accounts/" + studentId, null, adminCookie, "DELETE")).status,
  200,
);
assert.equal((await (await request("/api/session", null, lastCookie)).json()).user, null);
assert.ok(
  !(await request("/api/auth/sign-in/email", { email: accountUpdate.email, password: newPassword }))
    .ok,
);
assert.ok(
  !(await (await request("/api/admin/accounts", null, adminCookie)).json()).users.some(
    (user) => user.id === studentId,
  ),
);
console.log(
  "Passed management lists, project edit/delete, account edit/role/delete, duplicate email, self protection, session revocation and disabled bypass endpoints.",
);
