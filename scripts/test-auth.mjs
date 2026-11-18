import assert from "node:assert/strict";
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
const student = { email: studentEmail, password, name: "Test Student", role: "user" };
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
assert.equal((await request("/api/auth/sign-out", {}, studentCookie)).status, 200);
assert.equal((await (await request("/api/session", null, studentCookie)).json()).user, null);
assert.equal((await request("/projects/project-fullstack-web", null, studentCookie)).status, 302);
console.log(
  "Passed: sign-up disabled, incorrect password, session restore, HttpOnly cookie, protected projects, admin create, student access, privilege escalation denied, cross-origin denied, logout revocation.",
);
