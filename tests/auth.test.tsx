import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthGate } from "../src/pages/auth/AuthGate";
import { WorkSpace } from "../src/pages/Workspace";
import { AuthProvider, useAuth } from "../src/auth/AuthProvider";
import {
  DEFAULT_LOGIN_CREDENTIALS,
  DEMO_ACCOUNTS,
  getDemoCredentials,
} from "../src/auth/demoAccounts";
import { demoAuthService } from "../src/auth/demoAuthService";
import type { LoginCredentials } from "../src/auth/types";
import { I18nProvider } from "../src/i18n";
import { createTranslator } from "../src/i18n/messages";
import { ThemeProvider } from "../src/theme";

function credentials(overrides: Partial<LoginCredentials> = {}): LoginCredentials {
  return {
    studentId: "B11204018",
    name: "陳宥軒",
    password: "demo password",
    role: "學生 (Student)",
    ...overrides,
  };
}

test("demo login rejects blank accounts before checking passwords", () => {
  for (const studentId of ["", " \t\n "]) {
    assert.deepEqual(
      demoAuthService.login(credentials({ studentId, password: "" })),
      { ok: false, error: "accountRequired" },
    );
  }
});

test("demo login rejects empty or whitespace-only passwords", () => {
  for (const password of ["", " \t\n "]) {
    assert.deepEqual(demoAuthService.login(credentials({ password })), {
      ok: false,
      error: "passwordRequired",
    });
  }
});

test("successful login normalizes the profile without exposing the password or mutating input", () => {
  const input = Object.freeze(
    credentials({
      studentId: "  custom-student  ",
      name: "  Custom Name  ",
      role: "課程助教 (TA)",
    }),
  );

  assert.deepEqual(demoAuthService.login(input), {
    ok: true,
    user: {
      studentId: "custom-student",
      name: "Custom Name",
      role: "課程助教 (TA)",
    },
  });
  assert.equal(input.studentId, "  custom-student  ");
  assert.equal(input.name, "  Custom Name  ");
});

test("a blank display name falls back to the normalized account", () => {
  assert.deepEqual(
    demoAuthService.login(credentials({ studentId: "  arbitrary-account  ", name: " \t " })),
    {
      ok: true,
      user: {
        studentId: "arbitrary-account",
        name: "arbitrary-account",
        role: "學生 (Student)",
      },
    },
  );
});

test("the initial demonstration form remains signable", () => {
  assert.deepEqual(demoAuthService.login(DEFAULT_LOGIN_CREDENTIALS), {
    ok: true,
    user: {
      studentId: "B11204018",
      name: "陳宥軒",
      role: "學生 (Student)",
    },
  });
});

test("every demo selection creates independent credentials and preserves its profile on login", () => {
  assert.equal(DEMO_ACCOUNTS.length, 3);
  for (const account of DEMO_ACCOUNTS) {
    const first = getDemoCredentials(account);
    const second = getDemoCredentials(account);
    assert.notEqual(first, second);
    assert.equal(first.password, "material2026");
    assert.deepEqual(demoAuthService.login(first), {
      ok: true,
      user: {
        studentId: account.studentId,
        name: account.name,
        role: account.role,
      },
    });

    first.name = "Edited form name";
    first.password = "Edited form password";
    assert.equal(second.name, account.name);
    assert.equal(second.password, "material2026");
  }
});

function SessionStatus() {
  const { currentUser } = useAuth();
  return <span>{currentUser?.studentId ?? "signed out"}</span>;
}

test("authentication starts signed out and can render without browser storage", () => {
  assert.equal(
    renderToStaticMarkup(
      <AuthProvider>
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
        <AuthProvider>
          <AuthGate>{(session) => <WorkSpace {...session} />}</AuthGate>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  const visibleText = html.replace(/<[^>]*>/g, "");

  assert.ok(visibleText.includes(t("auth.title")));
  assert.match(html, /<form\b/);
  assert.ok(!visibleText.includes(t("auth.signOut")));
  assert.ok(!visibleText.includes(t("home.dashboard")));
  assert.doesNotMatch(html, /<(?:header|main)\b/);
});
