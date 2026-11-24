import { EditAccountDialog } from "@modules/accounts";
import { I18nProvider, createTranslator } from "@modules/i18n";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, beforeEach, test, vi } from "vite-plus/test";

import { ChangeAccountPassword } from "@/modules/accounts/ui/ChangeAccountPassword";

type ChangePasswordProps = ComponentProps<typeof ChangeAccountPassword>;

const capturedProps = vi.hoisted(() => [] as ChangePasswordProps[]);

vi.mock("@/modules/accounts/ui/ChangeAccountPassword", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/accounts/ui/ChangeAccountPassword")>();
  return {
    ...actual,
    ChangeAccountPassword: (props: ChangePasswordProps) => {
      capturedProps.push(props);
      return <actual.ChangeAccountPassword {...props} />;
    },
  };
});

beforeEach(() => {
  capturedProps.length = 0;
});

test("ChangeAccountPassword omits currentPassword when requireCurrentPassword is false", () => {
  const t = createTranslator("en");
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <ChangeAccountPassword
        endpoint="/api/admin/accounts/student-1"
        email="student@example.com"
        isSelf={false}
        requireCurrentPassword={false}
        initialOpen
        disabled={false}
      />
    </I18nProvider>,
  );

  assert.match(html, /<dialog\b/);
  assert.ok(!html.includes('name="currentPassword"'));
  assert.match(html, /<input(?=[^>]*name="newPassword")(?=[^>]*required)[^>]*>/);
  assert.ok(html.includes(t("admin.accountEditHelp")));
});

test("ChangeAccountPassword requires currentPassword for self and another admin", () => {
  const t = createTranslator("en");
  for (const isSelf of [true, false]) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <ChangeAccountPassword
          endpoint={isSelf ? "/api/account" : "/api/admin/accounts/admin-2"}
          email={isSelf ? "self@example.com" : "admin2@example.com"}
          isSelf={isSelf}
          requireCurrentPassword
          initialOpen
          disabled={false}
        />
      </I18nProvider>,
    );

    assert.match(html, /<dialog\b/);
    assert.match(html, /<input(?=[^>]*name="currentPassword")(?=[^>]*required)[^>]*>/);
    assert.match(html, /<input(?=[^>]*name="newPassword")(?=[^>]*required)[^>]*>/);
    assert.ok(html.includes(t(isSelf ? "admin.selfPasswordHelp" : "admin.accountEditHelp")));
  }
});

test("EditAccountDialog sets requireCurrentPassword only for self or admin targets", () => {
  const cases: Array<{
    management?: { id: string; role: string | null; isSelf: boolean };
    expectedIsSelf: boolean;
    expectedRequireCurrent: boolean;
  }> = [
    { management: undefined, expectedIsSelf: true, expectedRequireCurrent: true },
    {
      management: { id: "admin-1", role: "admin", isSelf: true },
      expectedIsSelf: true,
      expectedRequireCurrent: true,
    },
    {
      management: { id: "student-1", role: "user", isSelf: false },
      expectedIsSelf: false,
      expectedRequireCurrent: false,
    },
    {
      management: { id: "student-2", role: null, isSelf: false },
      expectedIsSelf: false,
      expectedRequireCurrent: false,
    },
    {
      management: { id: "admin-2", role: "admin", isSelf: false },
      expectedIsSelf: false,
      expectedRequireCurrent: true,
    },
  ];

  for (const testCase of cases) {
    capturedProps.length = 0;
    renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <EditAccountDialog
          account={{ name: "Test User", email: "user@example.com" }}
          management={testCase.management}
          onDismiss={() => {}}
          onSaved={() => {}}
        />
      </I18nProvider>,
    );
    assert.strictEqual(capturedProps.length, 1);
    assert.strictEqual(capturedProps[0].isSelf, testCase.expectedIsSelf);
    assert.strictEqual(capturedProps[0].requireCurrentPassword, testCase.expectedRequireCurrent);
  }
});
