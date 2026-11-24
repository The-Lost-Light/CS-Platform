import { AuthProvider, useAuth, AuthGate, type User } from "@modules/auth";
import { HomeDashboard } from "@modules/catalog";
import { I18nProvider, createTranslator } from "@modules/i18n";
import { ThemeProvider } from "@modules/theme";
import { betterAuth } from "better-auth";
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

  assert.ok(visibleText.includes(t("auth.title")));
  assert.match(html, /<form\b/);
  assert.ok(!visibleText.includes(t("auth.signOut")));
  assert.ok(!visibleText.includes(t("home.title")));
  assert.notMatch(html, /<(?:header|main)\b/);
});

test("Better Auth disables built-in account mutation and unused admin endpoints", async () => {
  const options = authConfig({
    defaults: {
      baseURL: "http://localhost/api/auth",
      secret: "test-secret-0123456789abcdef0123456789abcdef",
    },
    env: {},
    dialect: "sqlite",
    request: new Request("http://localhost/api/auth/ok"),
  });
  const instance = betterAuth(options);

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
