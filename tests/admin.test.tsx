import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test, vi } from "vite-plus/test";
import { I18nProvider } from "@i18n";
import { Navbar } from "@pages/layout/Navbar";
import AdminPage from "../pages/admin";
import { CreateProject } from "@pages/admin/CreateProject";
import { ConfirmDelete } from "@pages/admin/ConfirmDelete";
import { PROJECTS } from "@data/projectsData";
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
    "All projects (0)",
    "All accounts (0)",
  ])
    assert.ok(html.includes(text));
  assert.match(html, /<input(?=[^>]*name="title")(?=[^>]*required)[^>]*>/);
  assert.match(html, /<input(?=[^>]*name="codeName")(?=[^>]*required)[^>]*>/);
  assert.equal((html.match(/>Add<\/button>/g) ?? []).length, 2);
  assert.equal((html.match(/>View<\/button>/g) ?? []).length, 2);
  assert.match(html, /type="datetime-local"/);
  assert.match(html, /<input(?=[^>]*name="points")(?=[^>]*min="0")(?=[^>]*max="10000")[^>]*>/);
});

test("project editor prepopulates the selected project and preserves its identifier", () => {
  const project = { ...PROJECTS[0], title: "Editable example" };
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <CreateProject project={project} onCancel={() => {}} />
    </I18nProvider>,
  );
  assert.ok(html.includes("Edit project"));
  assert.ok(html.includes('value="Editable example"'));
  assert.ok(html.includes('value="' + project.codeName + '"'));
  assert.ok(html.includes("Save changes"));
  assert.ok(html.includes("Cancel"));
  assert.ok(!html.includes('name="id"'));
});
test("deletion confirmation identifies the record and explains session revocation", () => {
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <ConfirmDelete
        name="Example account"
        account
        pending={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </I18nProvider>,
  );
  assert.match(html, /role="alertdialog"/);
  assert.ok(html.includes("Example account"));
  assert.match(html, /all sessions will be revoked/i);
  assert.ok(html.includes("saved workspaces across all projects"));
  assert.ok(html.includes("Cancel"));
});
