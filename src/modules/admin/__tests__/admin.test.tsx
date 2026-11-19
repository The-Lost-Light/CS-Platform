import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test, vi } from "vite-plus/test";
import { I18nProvider } from "@modules/i18n";
import { Navbar } from "@app/Navbar";
import AdminPage from "../../../../pages/admin";
import { CreateProject } from "../ui/CreateProject";
import { ConfirmDelete } from "../ui/ConfirmDelete";
import { PROJECTS } from "@modules/projects";
import type { ReactNode } from "react";
vi.mock("@void/react", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@modules/catalog", () => ({
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
test("each management list has an Add button in its header", () => {
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <AdminPage />
    </I18nProvider>,
  );
  assert.ok(html.includes("Project management"));
  assert.ok(html.includes("Account management"));
  for (const title of ["All projects (0)", "All accounts (0)"])
    assert.ok(
      Array.from(html.matchAll(/<header\b[^>]*>([\s\S]*?)<\/header>/g)).some(
        ([header]) => header.includes(title) && header.includes(">Add</button>"),
      ),
    );
  assert.ok(!html.includes(">View</button>"));
  assert.ok(!html.includes("<form"));
});

test("project creation offers a return to the list and constrains inputs", () => {
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <CreateProject onCancel={() => {}} />
    </I18nProvider>,
  );
  assert.ok(html.includes("Create project"));
  assert.ok(html.includes("Taipei time"));
  assert.ok(html.includes("Back to list"));
  assert.match(html, /<input(?=[^>]*name="title")(?=[^>]*required)[^>]*>/);
  assert.match(html, /<input(?=[^>]*name="codeName")(?=[^>]*required)[^>]*>/);
  assert.match(html, /type="datetime-local"/);
  assert.match(html, /<textarea[^>]*name="content"/);
  assert.match(
    html,
    /<input(?=[^>]*type="file")(?=[^>]*multiple)(?=[^>]*name="attachments")[^>]*>/,
  );
  assert.doesNotMatch(html, /name="(?:defaultRepoUrl|requirements|initialDesignDoc)"/);
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
