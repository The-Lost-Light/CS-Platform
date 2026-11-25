import { I18nProvider } from "@modules/i18n";
import { RepositoryConnection } from "@modules/repository";
import { ThemeProvider } from "@modules/theme";
import { PersonalProject, ProjectWorkspace, StudentWorkspaceList } from "@modules/workspace";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

import {
  filterStudentWorkspaces,
  sortStudentWorkspaces,
} from "@/modules/workspace/model/studentList";
import { AssignmentPanel } from "@/modules/workspace/ui/AssignmentPanel";

import { sampleProjects } from "../../fixtures/projects";
import { createRepoFixture } from "../../fixtures/repository";

const enProject = sampleProjects[0];
const zhProject = sampleProjects[0];
const emptySnapshot = { accountId: "student", draft: null, revision: null, updatedAt: null };

test("Repo tab renders the URL and sync button in the workspace header card when unconfigured", () => {
  const html = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace project={enProject} snapshot={emptySnapshot} initialActiveTab="github" />
      </I18nProvider>
    </ThemeProvider>,
  );
  const header = html.split("</section>")[0];
  assert.match(header, /GitHub repository URL/);
  assert.match(header, /Sync GitHub project data/);
  assert.notMatch(header, /role="tooltip"/);
  assert.equal(header.match(/class="ui-card\b/g)?.length, 1);
});

test("Repo header fuses repo overview and language bar once configured, and returns to URL input when edit is triggered", () => {
  const bundle = createRepoFixture();
  let editing = false;
  const makeRepoState = () => ({
    repoUrl: bundle.repo.html_url,
    repoUrlInput: bundle.repo.html_url,
    setRepoUrlInput: () => {},
    repoBundle: bundle,
    isEditingRepo: editing,
    startEditingRepo: () => {
      editing = true;
    },
    isLoadingRepo: false,
    repoError: null,
    handleLoadRepo: async () => {},
    handleBranchChange: () => {},
  });

  const configuredHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <RepositoryConnection repository={makeRepoState()} />
    </I18nProvider>,
  );
  assert.notMatch(configuredHtml, /輸入學生專題 GitHub Repo 網址/);
  assert.match(configuredHtml, /<img[^>]*alt="tester"/);
  assert.match(configuredHtml, /owner\/repo/);
  assert.match(configuredHtml, /role="tooltip"[^>]*>修改 Repo 網址<\/span>/);
  assert.match(configuredHtml, /role="tooltip"[^>]*>未結案問題<\/span>/);
  assert.match(configuredHtml, /role="tooltip"[^>]*>Pull Requests 合併請求<\/span>/);
  assert.match(configuredHtml, /role="tooltip"[^>]*>Forks 分支數<\/span>/);
  assert.match(configuredHtml, /role="tooltip"[^>]*>Stars 星數<\/span>/);
  assert.match(configuredHtml, /TypeScript/);
  assert.match(configuredHtml, /100\.0%/);

  makeRepoState().startEditingRepo();
  const editingHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <RepositoryConnection repository={makeRepoState()} />
    </I18nProvider>,
  );
  assert.match(editingHtml, /輸入學生專題 GitHub Repo 網址/);
  assert.match(editingHtml, /同步 GitHub 專案數據/);
  assert.notMatch(editingHtml, /role="tooltip"[^>]*>修改 Repo 網址<\/span>/);
});

test("design tab bar hides file actions outside C4 Model and anchors them on the right when selected", () => {
  const assignmentHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace
          project={enProject}
          snapshot={emptySnapshot}
          initialActiveTab="assignment"
          initialDesignTab="diagram"
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(!assignmentHtml.includes('id="design-tab-readme"'));
  assert.ok(!assignmentHtml.includes("Import C4 JSON"));
  assert.ok(!assignmentHtml.includes("Export C4 JSON"));
  assert.notMatch(assignmentHtml, /type="file"/);

  const readmeHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace
          project={enProject}
          snapshot={emptySnapshot}
          initialActiveTab="design"
          initialDesignTab="readme"
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.match(readmeHtml, /id="design-tab-readme"[^>]*aria-selected="true"/);
  assert.match(readmeHtml, /id="design-tab-diagram"[^>]*aria-selected="false"/);
  assert.ok(!readmeHtml.includes("Import C4 JSON"));
  assert.ok(!readmeHtml.includes("Export C4 JSON"));
  assert.notMatch(readmeHtml, /type="file"/);

  for (const [locale, project, importLabel, exportLabel] of [
    ["en", enProject, "Import C4 JSON", "Export C4 JSON"],
    ["zh-TW", zhProject, "匯入 C4 JSON", "匯出 C4 JSON"],
  ] as const) {
    const diagramHtml = renderToStaticMarkup(
      <ThemeProvider>
        <I18nProvider initialLanguage={locale}>
          <ProjectWorkspace
            project={project}
            snapshot={emptySnapshot}
            initialActiveTab="design"
            initialDesignTab="diagram"
          />
        </I18nProvider>
      </ThemeProvider>,
    );
    const headerSection = diagramHtml.split("</section>")[0];
    assert.match(headerSection, /id="design-tab-diagram"[^>]*aria-selected="true"/);
    assert.ok(headerSection.includes(importLabel));
    assert.ok(headerSection.includes(exportLabel));
    assert.match(headerSection, /<input[^>]*type="file"/);
    assert.ok(
      headerSection.indexOf('id="design-tab-diagram"') < headerSection.indexOf(importLabel),
    );
    assert.ok(headerSection.indexOf(importLabel) < headerSection.indexOf(exportLabel));
  }
});

test("StudentWorkspaceList prioritizes submitted accounts and links back home", () => {
  const students = [
    { id: "s2", name: "Bob", email: "bob@example.com", hasWorkspace: false, updatedAt: null },
    {
      id: "s1",
      name: "Alice",
      email: "alice@example.com",
      hasWorkspace: true,
      updatedAt: Date.parse("2026-11-24T15:45:00+08:00"),
    },
  ];
  const openNow = Date.parse("2026-11-24T16:00:00+08:00");
  const enHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <StudentWorkspaceList
        project={enProject}
        students={students}
        onSelectStudent={() => {}}
        now={openNow}
      />
    </I18nProvider>,
  );
  const renderedTitle = renderToStaticMarkup(<>{enProject.title}</>);
  const enTopHeader = enHtml.split("</section>")[0];
  const enCardHeader = enHtml.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.ok(enHtml.includes(renderedTitle));
  assert.ok(enCardHeader.includes("All students (2)"));
  assert.ok(enCardHeader.includes("Submitted: 1 / 2"));
  assert.ok(enCardHeader.indexOf("All students (2)") < enCardHeader.indexOf("Submitted: 1 / 2"));
  assert.ok(!enTopHeader.includes("Submitted: 1 / 2"));
  assert.ok(enHtml.includes("2026-11-24 15:45"));
  assert.ok(enHtml.includes('href="/"'));
  assert.ok(enHtml.includes('aria-label="Back to home"'));
  assert.ok(enHtml.indexOf("Alice") < enHtml.indexOf("Bob"));

  const zhHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <StudentWorkspaceList
        project={zhProject}
        students={students}
        onSelectStudent={() => {}}
        now={openNow}
      />
    </I18nProvider>,
  );
  const zhTopHeader = zhHtml.split("</section>")[0];
  const zhCardHeader = zhHtml.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.ok(zhCardHeader.includes("所有學生（2）"));
  assert.ok(zhCardHeader.includes("已繳交：1 / 2"));
  assert.ok(!zhTopHeader.includes("已繳交：1 / 2"));
  assert.ok(zhHtml.includes(">已繳交<"));
  assert.ok(zhHtml.includes(">未繳交<"));
  assert.ok(zhHtml.indexOf("Alice") < zhHtml.indexOf("Bob"));
});

test("ProjectWorkspace hides project index badge and displays student name and back-to-list link in readOnly mode", () => {
  const ownHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace project={enProject} snapshot={emptySnapshot} />
      </I18nProvider>
    </ThemeProvider>,
  );
  const ownHeader = ownHtml.split("</section>")[0];
  assert.ok(ownHeader.includes(renderToStaticMarkup(<>{enProject.title}</>)));
  assert.ok(!ownHeader.includes("ui-code-badge"));

  const diagramHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace
          project={enProject}
          snapshot={{ accountId: "s1", draft: null, revision: null, updatedAt: null }}
          initialActiveTab="design"
          initialDesignTab="diagram"
          readOnly
          studentName="Alice"
          closeHref={`/projects/${enProject.id}?students=1`}
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  const headerSection = diagramHtml.split("</section>")[0];
  assert.ok(headerSection.includes("Viewing: Alice"));
  assert.ok(!headerSection.includes("· Alice"));
  assert.ok(!headerSection.includes("ui-code-badge"));
  assert.ok(headerSection.includes(`href="/projects/${enProject.id}?students=1"`));
  assert.ok(headerSection.includes('aria-label="Back to student list"'));
  assert.ok(!headerSection.includes("Saved to your account"));
  assert.ok(!headerSection.includes("Import C4 JSON"));
  assert.ok(headerSection.includes("Export C4 JSON"));
  assert.notMatch(headerSection, /type="file"/);

  const zhViewingHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="zh-TW">
        <ProjectWorkspace
          project={zhProject}
          snapshot={{ accountId: "s1", draft: null, revision: null, updatedAt: null }}
          readOnly
          studentName="Alice"
          closeHref={`/projects/${zhProject.id}?students=1`}
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(zhViewingHtml.includes("檢視： Alice"));

  const readmeHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace
          project={enProject}
          snapshot={{ accountId: "s1", draft: null, revision: null, updatedAt: null }}
          initialActiveTab="design"
          initialDesignTab="readme"
          readOnly
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(readmeHtml.includes("This student has not written a README design document yet."));

  const repoHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace
          project={enProject}
          snapshot={{ accountId: "s1", draft: null, revision: null, updatedAt: null }}
          initialActiveTab="github"
          readOnly
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(repoHtml.includes("This student has not linked a GitHub repository yet."));
  assert.ok(!repoHtml.includes("GitHub repository URL"));

  const bundle = createRepoFixture();
  const repoConnectedHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <RepositoryConnection
        readOnly
        repository={{
          repoUrl: bundle.repo.html_url,
          repoUrlInput: bundle.repo.html_url,
          setRepoUrlInput: () => {},
          repoBundle: bundle,
          isEditingRepo: false,
          startEditingRepo: () => {},
          isLoadingRepo: false,
          repoError: null,
          handleLoadRepo: async () => {},
          handleBranchChange: () => {},
        }}
      />
    </I18nProvider>,
  );
  assert.ok(repoConnectedHtml.includes("owner/repo"));
  assert.notMatch(repoConnectedHtml, /修改 Repo 網址/);
});

test("student list sorting and filtering handle search, submission states, and overdue status", () => {
  const dueDate = "2026-11-25 23:59";
  const students = [
    {
      id: "s3",
      name: "Charlie",
      email: "charlie@example.com",
      hasWorkspace: true,
      updatedAt: Date.parse("2026-11-26T01:00:00+08:00"),
    },
    { id: "s2", name: "Bob", email: "bob@example.com", hasWorkspace: false, updatedAt: null },
    {
      id: "s1",
      name: "Alice",
      email: "alice@example.com",
      hasWorkspace: true,
      updatedAt: Date.parse("2026-11-24T12:00:00+08:00"),
    },
  ];
  const sorted = sortStudentWorkspaces(students);
  assert.deepEqual(
    sorted.map((s) => s.id),
    ["s1", "s3", "s2"],
  );
  assert.deepEqual(
    filterStudentWorkspaces(sorted, { search: "BOB@", status: "all", dueDate }).map((s) => s.id),
    ["s2"],
  );
  assert.deepEqual(
    filterStudentWorkspaces(sorted, { search: "", status: "submitted", dueDate }).map((s) => s.id),
    ["s1", "s3"],
  );
  assert.deepEqual(
    filterStudentWorkspaces(sorted, { search: "", status: "empty", dueDate }).map((s) => s.id),
    ["s2"],
  );
  const beforeDue = Date.parse("2026-11-25T10:00:00+08:00");
  assert.deepEqual(
    filterStudentWorkspaces(sorted, { search: "", status: "late", dueDate, now: beforeDue }).map(
      (s) => s.id,
    ),
    ["s3"],
  );
  const afterDue = Date.parse("2026-11-26T10:00:00+08:00");
  assert.deepEqual(
    filterStudentWorkspaces(sorted, { search: "", status: "late", dueDate, now: afterDue }).map(
      (s) => s.id,
    ),
    ["s3", "s2"],
  );
});

test("StudentWorkspaceList renders search, filter pills, and late/overdue indicators", () => {
  const project = { ...enProject, dueDate: "2026-11-25 23:59" };
  const students = [
    {
      id: "s1",
      name: "Alice",
      email: "alice@example.com",
      hasWorkspace: true,
      updatedAt: Date.parse("2026-11-26T00:30:00+08:00"),
    },
    { id: "s2", name: "Bob", email: "bob@example.com", hasWorkspace: false, updatedAt: null },
  ];
  const afterDue = Date.parse("2026-11-26T01:00:00+08:00");
  const enHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <StudentWorkspaceList
        project={project}
        students={students}
        onSelectStudent={() => {}}
        now={afterDue}
      />
    </I18nProvider>,
  );
  assert.ok(enHtml.includes('type="search"'));
  assert.ok(!enHtml.includes("<label"));
  assert.ok(enHtml.includes('aria-label="Search students"'));
  assert.ok(enHtml.includes('placeholder="Filter by student name or email…"'));
  assert.ok(enHtml.includes("All (2)"));
  assert.ok(enHtml.includes("Submitted (1)"));
  assert.ok(enHtml.includes("Not submitted (1)"));
  assert.ok(enHtml.includes("Overdue (2)"));
  assert.ok(enHtml.includes(">Late<"));
  assert.ok(enHtml.includes(">Overdue<"));

  const zhHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <StudentWorkspaceList
        project={{ ...zhProject, dueDate: "2026-11-25 23:59" }}
        students={students}
        onSelectStudent={() => {}}
        now={afterDue}
      />
    </I18nProvider>,
  );
  assert.ok(!zhHtml.includes("<label"));
  assert.ok(zhHtml.includes('aria-label="搜尋學生"'));
  assert.ok(zhHtml.includes('placeholder="輸入學生姓名或電子郵件搜尋…"'));
  assert.ok(zhHtml.includes("搜尋學生"));
  assert.ok(zhHtml.includes("逾期（2）"));
  assert.ok(zhHtml.includes(">逾期<"));
  assert.ok(zhHtml.includes(">已逾期<"));
});

test("AssignmentPanel shows overdue and due-soon badges deterministically", () => {
  const project = { ...enProject, dueDate: "2026-11-25 23:59" };
  const dueSoonHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <AssignmentPanel project={project} now={Date.parse("2026-11-25T12:00:00+08:00")} />
    </I18nProvider>,
  );
  assert.ok(dueSoonHtml.includes("Due soon"));

  const overdueHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <AssignmentPanel project={project} now={Date.parse("2026-11-26T00:01:00+08:00")} />
    </I18nProvider>,
  );
  assert.ok(overdueHtml.includes("已逾期"));
});

test("ProjectWorkspace locks edits when deadlineLocked and renders student navigation in read-only mode", () => {
  const lockedHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="zh-TW">
        <ProjectWorkspace
          project={{ ...zhProject, dueDate: "2026-11-25 23:59" }}
          snapshot={{
            accountId: "student",
            draft: null,
            revision: null,
            updatedAt: Date.parse("2026-11-25T20:00:00+08:00"),
          }}
          initialActiveTab="design"
          initialDesignTab="readme"
          deadlineLocked
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(lockedHtml.includes("已截止・已鎖定"));
  assert.ok(lockedHtml.includes("本專案已超過截止時間（2026-11-25 23:59 UTC+8）"));
  assert.ok(lockedHtml.includes("最後更新：2026-11-25 20:00 (UTC+8)"));
  assert.ok(lockedHtml.includes("截止前尚未撰寫 README 設計文件。"));
  assert.ok(lockedHtml.includes("截止前尚未綁定 GitHub 倉庫。"));
  assert.ok(!lockedHtml.includes("尚未儲存作業"));
  assert.notMatch(lockedHtml, /type="file"/);

  const navHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace
          project={{ ...enProject, dueDate: "2026-11-25 23:59" }}
          snapshot={{
            accountId: "s2",
            draft: null,
            revision: "rev-2",
            updatedAt: Date.parse("2026-11-26T01:15:00+08:00"),
          }}
          initialActiveTab="design"
          readOnly
          studentName="Bob"
          studentNavigation={{
            currentIndex: 1,
            total: 3,
            previousName: "Alice",
            nextName: "Charlie",
            onPrevious: () => {},
            onNext: () => {},
          }}
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(navHtml.includes("Viewing: Bob"));
  assert.ok(navHtml.includes("Late · Updated 2026-11-26 01:15 (UTC+8)"));
  assert.ok(navHtml.includes("2 / 3"));
  assert.ok(navHtml.includes('aria-label="Previous student: Alice"'));
  assert.ok(navHtml.includes('aria-label="Next student: Charlie"'));
});

test("PersonalProject renders StudentWorkspaceList when initialShowStudentList is set for admin", () => {
  const html = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <PersonalProject project={enProject} accountId="admin-1" isAdmin initialShowStudentList />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(html.includes("All students (0)"));
});
