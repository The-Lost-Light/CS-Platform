import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test, vi } from "vite-plus/test";
import { I18nProvider } from "@i18n";
import { Navbar } from "@pages/layout/Navbar";
import AdminPage from "../pages/admin";
import type { ReactNode } from "react";
vi.mock("@void/react", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@hooks/ProjectCatalog", () => ({
  useProjectCatalog: () => ({ projects: [], addProject: vi.fn() }),
}));
test("only administrators have a management navigation entry", () => {
  for (const role of ["admin", "user"]) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <Navbar
          activeView="admin"
          selectedProject={null}
          onNavigateHome={() => {}}
          onSelectProjectDefault={() => {}}
          currentUser={{ name: "Test", studentId: "test@example.com", role }}
          onLogout={() => {}}
        />
      </I18nProvider>,
    );
    assert.equal(html.includes('href="/admin"'), role === "admin");
    assert.ok(!html.includes("Account management"));
  }
});
test("management contains project creation and account management, with constrained inputs", () => {
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <AdminPage />
    </I18nProvider>,
  );
  for (const text of [
    "Management",
    "Project management",
    "Account management",
    "Create project",
    "Taipei time",
  ])
    assert.ok(html.includes(text));
  assert.match(html, /<input(?=[^>]*name="title")(?=[^>]*required)[^>]*>/);
  assert.match(html, /<input(?=[^>]*name="codeName")(?=[^>]*required)[^>]*>/);
  assert.match(html, /type="datetime-local"/);
  assert.match(html, /<input(?=[^>]*name="points")(?=[^>]*min="0")(?=[^>]*max="10000")[^>]*>/);
});
