import { AuthProvider, useAuth, AuthGate, type User } from "@modules/auth";
import { HomeDashboard } from "@modules/catalog";
import { I18nProvider, createTranslator } from "@modules/i18n";
import { ThemeProvider } from "@modules/theme";
import { MAX_ACCOUNT_EMAIL_LENGTH, MAX_ACCOUNT_NAME_LENGTH } from "@shared/accountPolicy";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

import authConfig from "../auth";

const stubAuthService = {
  login: () => ({ ok: false as const, error: "invalidCredentials" as const }),
};

const testUser: User = {
  id: "student-1",
  studentId: "student@example.com",
  name: "Alex Chen",
  role: "user",
};

function SessionStatus() {
  const { currentUser } = useAuth();
  return <span>{currentUser?.studentId ?? "signed out"}</span>;
}

test("authentication starts signed out and can render without browser storage", () => {
  assert.strictEqual(
    renderToStaticMarkup(
      <AuthProvider service={stubAuthService}>
        <SessionStatus />
      </AuthProvider>,
    ),
    "<span>signed out</span>",
  );
});

test("using authentication outside its provider reports the missing boundary", () => {
  assert.throws(() => renderToStaticMarkup(<SessionStatus />), /AuthProvider/);
});

test("AuthGate initially presents login and hides authenticated navigation and dashboard", () => {
  const t = createTranslator("en");
  const html = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <AuthProvider service={stubAuthService}>
          <AuthGate>
            <main>
              <HomeDashboard projects={[]} currentUser={testUser} onOpenProject={() => {}} />
            </main>
          </AuthGate>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  const visibleText = html.replace(/<[^>]*>/g, "");

  assert.ok(visibleText.includes(t("app.title")));
  assert.ok(visibleText.includes(t("auth.intro")));
  assert.ok(visibleText.includes(t("auth.title")));
  assert.match(html, /<form\b/);
  assert.notMatch(visibleText, /code\s*pulse/i);
  assert.ok(!visibleText.includes("Material You 3"));
  assert.ok(!visibleText.includes(t("auth.signOut")));
  assert.ok(!visibleText.includes(t("home.title")));
  assert.notMatch(html, /<(?:header|main)\b/);
});

function createAuthInstance() {
  const options = authConfig({
    defaults: {
      baseURL: "http://localhost/api/auth",
      secret: "test-secret-0123456789abcdef0123456789abcdef",
    },
    env: {},
    dialect: "sqlite",
    request: new Request("http://localhost/api/auth/ok"),
  });
  return { options, instance: betterAuth(options) };
}

test("Better Auth disables built-in account mutation and unused admin endpoints", async () => {
  const { options, instance } = createAuthInstance();

  const disabledEndpoints: Array<[string, string]> = [
    ["POST", "/update-user"],
    ["POST", "/update-user/"],
    ["POST", "/change-password"],
    ["POST", "/change-email"],
    ["POST", "/delete-user"],
    ["GET", "/delete-user/callback"],
    ["POST", "/admin/update-user"],
    ["POST", "/admin/set-user-password"],
    ["POST", "/admin/set-role"],
    ["POST", "/admin/remove-user"],
    ["POST", "/admin/ban-user"],
    ["POST", "/admin/unban-user"],
    ["POST", "/admin/impersonate-user"],
    ["POST", "/admin/impersonate-user/"],
    ["POST", "/admin/stop-impersonating"],
    ["GET", "/admin/list-users"],
    ["GET", "/admin/get-user"],
    ["POST", "/admin/list-user-sessions"],
    ["POST", "/admin/revoke-user-session"],
    ["POST", "/admin/revoke-user-sessions"],
    ["POST", "/admin/has-permission"],
  ];

  for (const [method, path] of disabledEndpoints) {
    const response = await instance.handler(
      new Request("http://localhost/api/auth" + path, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? "{}" : undefined,
      }),
    );
    assert.strictEqual(response.status, 404, `${method} /api/auth${path} should return 404`);
  }

  for (const allowedPath of ["/sign-in/email", "/sign-out", "/get-session", "/admin/create-user"]) {
    assert.ok(
      !(options.disabledPaths ?? []).includes(allowedPath),
      `${allowedPath} must remain enabled`,
    );
  }

  const okResponse = await instance.handler(new Request("http://localhost/api/auth/ok"));
  assert.strictEqual(okResponse.status, 200);
});

test("POST /api/auth/admin/create-user rejects missing passwords, invalid fields, and data injection", async () => {
  const { instance } = createAuthInstance();
  const basePayload = {
    name: "Alex Chen",
    email: "alex@example.com",
    password: "password123",
    role: "user",
  };
  const postCreate = (payload: unknown) =>
    instance.handler(
      new Request("http://localhost/api/auth/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
        },
        body: JSON.stringify(payload),
      }),
    );

  const { password: _missingPassword, ...withoutPassword } = basePayload;
  const { name: _missingName, ...withoutName } = basePayload;
  const { email: _missingEmail, ...withoutEmail } = basePayload;
  const { role: _missingRole, ...withoutRole } = basePayload;

  const invalidPayloads: unknown[] = [
    withoutPassword,
    { ...basePayload, password: "1".repeat(MIN_PASSWORD_LENGTH - 1) },
    { ...basePayload, password: "1".repeat(MAX_PASSWORD_LENGTH + 1) },
    { ...basePayload, password: 12345678 },
    withoutName,
    { ...basePayload, name: "" },
    { ...basePayload, name: "   \t\n  " },
    { ...basePayload, name: "a".repeat(MAX_ACCOUNT_NAME_LENGTH + 1) },
    withoutEmail,
    { ...basePayload, email: "not-an-email" },
    { ...basePayload, email: "user@invalid" },
    { ...basePayload, email: "a".repeat(MAX_ACCOUNT_EMAIL_LENGTH - 10) + "@test.local" },
    withoutRole,
    { ...basePayload, role: ["user"] },
    { ...basePayload, role: "owner" },
    { ...basePayload, role: "ADMIN" },
    { ...basePayload, role: "USER" },
    { ...basePayload, data: { emailVerified: true } },
    { ...basePayload, data: { banned: true } },
    { ...basePayload, data: { deleted: true } },
    { ...basePayload, data: { role: "admin" } },
    { ...basePayload, data: {} },
    { ...basePayload, emailVerified: true },
    { ...basePayload, id: "custom-id" },
    { ...basePayload, banned: true },
    { ...basePayload, deleted: true },
    null,
    [],
  ];

  for (const payload of invalidPayloads) {
    const response = await postCreate(payload);
    assert.strictEqual(response.status, 400, `Expected 400 for payload ${JSON.stringify(payload)}`);
  }

  for (const validPayload of [
    {
      name: "  Alex Chen  ",
      email: "  Alex@Example.com  ",
      password: "password123",
      role: "user",
    },
    {
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    },
  ]) {
    const response = await postCreate(validPayload);
    assert.strictEqual(
      response.status,
      401,
      `Expected valid payload to pass validation to auth check for ${validPayload.role}`,
    );
  }
});

test("createUser API normalizes name/email, stores credentials, and rejects invalid payloads", async () => {
  const { instance } = createAuthInstance();

  const created = await instance.api.createUser({
    body: {
      name: "  Alex Chen  ",
      email: "  Alex.Chen@Example.COM ",
      password: "password123",
      role: "user",
    },
  });

  assert.strictEqual(created.user.name, "Alex Chen");
  assert.strictEqual(created.user.email, "alex.chen@example.com");
  assert.strictEqual(created.user.role, "user");
  assert.strictEqual(created.user.emailVerified, false);

  const signedIn = await instance.api.signInEmail({
    body: { email: "alex.chen@example.com", password: "password123" },
  });
  assert.strictEqual(signedIn.user.id, created.user.id);

  await (
    await instance.$context
  ).internalAdapter.updateUser(created.user.id, {
    deleted: true,
  } as Record<string, unknown>);
  let deletedLoginError: unknown;
  try {
    await instance.api.signInEmail({
      body: { email: "alex.chen@example.com", password: "password123" },
    });
  } catch (error) {
    deletedLoginError = error;
  }
  assert.ok(deletedLoginError instanceof APIError, "Expected soft-deleted user sign-in to fail");

  const invalidCalls: Array<{ name: string; run: () => Promise<unknown> }> = [
    {
      name: "omitted password",
      run: () =>
        instance.api.createUser({
          body: { name: "No Pass", email: "nopass@example.com", role: "user" },
        }),
    },
    {
      name: "data injection",
      run: () =>
        instance.api.createUser({
          body: {
            name: "Injected",
            email: "inject@example.com",
            password: "password123",
            role: "user",
            data: { emailVerified: true },
          },
        }),
    },
    {
      name: "invalid role",
      run: () =>
        Reflect.apply(instance.api.createUser, instance.api, [
          {
            body: {
              name: "Owner",
              email: "owner@example.com",
              password: "password123",
              role: "owner",
            },
          },
        ]) as Promise<unknown>,
    },
    {
      name: "whitespace name",
      run: () =>
        instance.api.createUser({
          body: {
            name: "   ",
            email: "blank@example.com",
            password: "password123",
            role: "user",
          },
        }),
    },
  ];

  for (const testCase of invalidCalls) {
    let caught: unknown;
    try {
      await testCase.run();
    } catch (error) {
      caught = error;
    }
    assert.ok(
      caught instanceof APIError && caught.statusCode === 400,
      `Expected 400 APIError for ${testCase.name}`,
    );
  }
});
