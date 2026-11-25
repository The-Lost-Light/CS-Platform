import { EditAccountDialog } from "@modules/accounts";
import { HomeDashboard } from "@modules/catalog";
import { I18nProvider } from "@modules/i18n";
import { PROJECTS, type Project } from "@modules/projects";
import { SettingsProvider } from "@modules/settings";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test, vi } from "vite-plus/test";

import { AccountManagement } from "@/modules/admin/ui/AccountManagement";
import { ConfirmDelete } from "@/modules/admin/ui/ConfirmDelete";
import { CreateProject } from "@/modules/admin/ui/CreateProject";
import { ProjectList } from "@/modules/admin/ui/ProjectList";

import AdminPage from "../../../pages/admin";

const catalogMock = vi.hoisted(() => ({
  projects: [] as Project[],
}));

vi.mock("@void/react", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@modules/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@modules/catalog")>()),
  useProjectCatalog: () => ({
    projects: catalogMock.projects,
    addProject: vi.fn(),
    removeProject: vi.fn(),
    replaceProjects: vi.fn(),
  }),
}));
test("only administrators have a management navigation entry on the home dashboard card", () => {
  for (const role of ["admin", "user"]) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <HomeDashboard
            projects={[]}
            onOpenProject={() => {}}
            currentUser={{ name: "Test", studentId: "test@example.com", role }}
          />
        </SettingsProvider>
      </I18nProvider>,
    );
    assert.strictEqual(html.includes('href="/admin"'), role === "admin");
    assert.ok(html.includes(">Settings<"));
    assert.ok(html.includes(">Sign out<"));
    assert.ok(html.indexOf(">Settings<") < html.indexOf(">Sign out<"));
    if (role === "admin") {
      assert.ok(html.indexOf('href="/admin"') < html.indexOf(">Settings<"));
    }
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
  assert.ok(html.includes('href="/"'));
  assert.ok(html.includes('aria-label="Back to home"'));
  for (const title of ["All projects (0)", "All accounts (0)"])
    assert.ok(
      Array.from(html.matchAll(/<header\b[^>]*>([\s\S]*?)<\/header>/g)).some(
        ([header]) => header.includes(title) && header.includes(">Add</button>"),
      ),
    );
  assert.ok(!html.includes("<label"));
  assert.match(
    html,
    /<input(?=[^>]*type="search")(?=[^>]*aria-label="Search")(?=[^>]*placeholder="Search")[^>]*>/,
  );
  assert.ok(!html.includes(">View</button>"));
  assert.ok(!html.includes("<form"));
});

test("project creation opens in a cancellable dialog and constrains inputs", () => {
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <CreateProject onCancel={() => {}} onSaved={() => {}} />
    </I18nProvider>,
  );
  assert.ok(html.includes("Create project"));
  assert.ok(html.includes("Taipei time"));
  assert.match(html, /<dialog\b[^>]*aria-labelledby=/);
  assert.ok(html.includes("Cancel"));
  assert.match(html, /<input(?=[^>]*name="title")(?=[^>]*required)[^>]*>/);
  assert.ok(!html.includes('name="codeName"'));
  assert.ok(!html.includes('name="index"'));
  assert.match(html, /type="datetime-local"/);
  assert.match(html, /<textarea[^>]*name="content"/);
  assert.match(
    html,
    /<input(?=[^>]*type="file")(?=[^>]*multiple)(?=[^>]*name="attachments")[^>]*>/,
  );
  assert.notMatch(html, /name="(?:defaultRepoUrl|requirements|initialDesignDoc|summary|tags)"/);
  assert.match(html, /<input(?=[^>]*name="points")(?=[^>]*min="0")(?=[^>]*max="10000")[^>]*>/);
});

test("project editor prepopulates the selected project and preserves its identifier", () => {
  const project = { ...PROJECTS[0], title: "Editable example" };
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <CreateProject project={project} onCancel={() => {}} onSaved={() => {}} />
    </I18nProvider>,
  );
  assert.ok(html.includes("Edit project"));
  assert.match(html, /<dialog\b[^>]*aria-labelledby=/);
  assert.ok(html.includes('value="Editable example"'));
  assert.ok(html.includes("Save changes"));
  assert.ok(html.includes("Cancel"));
  assert.ok(!html.includes('name="id"'));
  assert.ok(!html.includes('name="codeName"'));
  assert.ok(!html.includes('name="index"'));
  assert.ok(!html.includes('name="tags"'));
});
test("ProjectList renders the Index header, drag handles, and sequential index badges", () => {
  catalogMock.projects = [
    { ...PROJECTS[0], index: 1, title: "Zeta Project" },
    { ...PROJECTS[1], index: 2, title: "Alpha Project" },
  ];
  try {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <ProjectList ref={null} />
      </I18nProvider>,
    );
    assert.ok(html.includes(">Index<"));
    assert.ok(html.includes('class="ui-code-badge">1</span>'));
    assert.ok(html.includes('class="ui-code-badge">2</span>'));
    assert.ok(html.includes("lucide-grip-vertical"));
    assert.ok(html.includes('draggable="true"'));
    assert.ok(html.includes('title="Drag to reorder projects"'));
    assert.ok(html.indexOf("Zeta Project") < html.indexOf("Alpha Project"));

    catalogMock.projects = [{ ...PROJECTS[0], index: 1, title: "Single Project" }];
    const singleHtml = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <ProjectList ref={null} />
      </I18nProvider>,
    );
    assert.ok(singleHtml.includes('draggable="false"'));
    assert.ok(!singleHtml.includes('draggable="true"'));
  } finally {
    catalogMock.projects = [];
  }
});

test("ProjectList renders reorder saved notice as a status chip before the Add button", () => {
  for (const [locale, savedLabel, addButton] of [
    ["zh-TW", "變更已儲存。", ">新增</button>"],
    ["en", "Changes saved.", ">Add</button>"],
  ] as const) {
    const idleHtml = renderToStaticMarkup(
      <I18nProvider initialLanguage={locale}>
        <ProjectList ref={null} />
      </I18nProvider>,
    );
    const idleHeader = idleHtml.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0] ?? "";
    assert.ok(!idleHeader.includes('role="status"'));
    assert.ok(!idleHtml.includes(savedLabel));

    const savedHtml = renderToStaticMarkup(
      <I18nProvider initialLanguage={locale}>
        <ProjectList ref={null} initialReorderSaved />
      </I18nProvider>,
    );
    const savedHeader = savedHtml.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0] ?? "";
    assert.match(savedHeader, /role="status"/);
    assert.ok(savedHeader.includes("ui-chip-success"));
    assert.ok(savedHeader.includes("border-success-outline"));
    assert.ok(savedHeader.includes(savedLabel));
    assert.ok(savedHeader.includes(addButton));
    assert.ok(savedHeader.indexOf(savedLabel) < savedHeader.indexOf(addButton));
    assert.ok(!savedHtml.includes("ui-banner-success"));
  }
});
test("deletion confirmation identifies the record and explains soft-delete retention and session revocation", () => {
  const accountHtml = renderToStaticMarkup(
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
  assert.match(accountHtml, /role="alertdialog"/);
  assert.ok(accountHtml.includes("Example account"));
  assert.match(accountHtml, /all sessions will be revoked/i);
  assert.ok(accountHtml.includes("keeping its database records"));
  assert.ok(accountHtml.includes("saved workspaces across all projects"));
  assert.ok(accountHtml.includes("Cancel"));

  const projectHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <ConfirmDelete
        name="Example project"
        pending={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </I18nProvider>,
  );
  assert.ok(projectHtml.includes("keeping the project and every account’s saved workspace"));
});

test("account creation places password help directly beneath password input before role", () => {
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <AccountManagement onCreated={() => {}} onDismiss={() => {}} />
    </I18nProvider>,
  );
  const helpText = "請使用 8 到 16 個字元的密碼。";
  assert.match(html, /<dialog\b[^>]*aria-labelledby=/);
  const passwordIndex = html.indexOf('name="password"');
  const helpIndex = html.indexOf(helpText);
  const roleIndex = html.indexOf('name="role"');
  assert.ok(passwordIndex !== -1 && helpIndex !== -1 && roleIndex !== -1);
  assert.ok(passwordIndex < helpIndex && helpIndex < roleIndex);

  const passwordInputMatch = html.match(/<input[^>]*name="password"[^>]*>/);
  assert.ok(passwordInputMatch);
  const describedByMatch = passwordInputMatch[0].match(/aria-describedby="([^"]+)"/);
  assert.ok(describedByMatch);
  const helpId = describedByMatch[1];
  assert.ok(html.includes(`<p id="${helpId}" class="ui-field-help">${helpText}</p>`));
});

test("account editor has a password action in the header and role controls for administrators", () => {
  for (const management of [
    undefined,
    { id: "42", role: "admin", isSelf: true },
    { id: "43", role: "user", isSelf: false },
  ]) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <EditAccountDialog
          account={{ name: "Example", email: "example@test.local" }}
          management={management}
          onDismiss={() => {}}
          onSaved={() => {}}
        />
      </I18nProvider>,
    );
    assert.match(html, /<dialog\b[^>]*aria-labelledby=/);
    assert.ok(html.includes('value="example@test.local"'));
    assert.ok(html.includes('value="Example"'));
    const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1] ?? "";
    assert.ok(header.includes("Edit account"));
    assert.ok(header.includes("Change password"));
    assert.strictEqual(html.includes('name="role"'), Boolean(management));
    if (management) {
      const studentOption = html.match(/<option[^>]*value="user"[^>]*>/)?.[0];
      assert.ok(studentOption);
      assert.strictEqual(studentOption.includes("disabled"), management.isSelf);
    }
  }
});

test("only administrators see the Student projects entry for each project on HomeDashboard", () => {
  const project = PROJECTS[0];
  for (const role of ["admin", "user"]) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <HomeDashboard
            projects={[project]}
            onOpenProject={() => {}}
            currentUser={{ name: "Test", studentId: "test@example.com", role }}
          />
        </SettingsProvider>
      </I18nProvider>,
    );
    assert.strictEqual(
      html.includes(`href="/projects/${encodeURIComponent(project.id)}?students=1"`),
      role === "admin",
    );
    assert.strictEqual(html.includes(">Student projects<"), role === "admin");
    if (role === "admin") {
      assert.ok(html.indexOf(">Student projects<") < html.indexOf("lucide-chevron-right"));
    }
  }
});
