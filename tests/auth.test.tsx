import { AuthProvider, useAuth, AuthGate, type User } from "@modules/auth";
import { HomeDashboard } from "@modules/catalog";
import { I18nProvider, createTranslator } from "@modules/i18n";
import { ThemeProvider } from "@modules/theme";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

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
