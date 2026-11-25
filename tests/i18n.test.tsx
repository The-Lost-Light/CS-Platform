import { AuthProvider, AuthGate, LoginView, type User } from "@modules/auth";
import { HomeDashboard } from "@modules/catalog";
import {
  I18nProvider,
  createTranslator,
  englishMessages,
  isMessageKey,
  resolveLocale,
  traditionalChineseMessages,
  type MessageKey,
} from "@modules/i18n";
import { getLocalizedProjects } from "@modules/projects";
import { GitHubRepoDashboard, fetchGitHubProjectBundle } from "@modules/repository";
import { SettingsButton, SettingsDialog, SettingsProvider } from "@modules/settings";
import {
  DEFAULT_THEME_PALETTE,
  SUPPORTED_THEME_PALETTES,
  ThemeProvider,
  isThemeMode,
  isThemePalette,
  resolveTheme,
} from "@modules/theme";
import { ProjectWorkspace } from "@modules/workspace";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, expect, test } from "vite-plus/test";

import { createRepoFixture } from "./fixtures/repository";

const testUser: User = {
  id: "student-1",
  studentId: "student@example.com",
  name: "Alex Chen",
  role: "user",
};
const stubAuthService = {
  login: () => ({ ok: false as const, error: "invalidCredentials" as const }),
};

const en = getLocalizedProjects("en");
const zh = getLocalizedProjects("zh-TW");
const t = createTranslator("en");
const han = /[\u3400-\u9fff]/;
const bundle = createRepoFixture();

test("saved language takes priority; unsupported values fall back to browser languages or English", () => {
  assert.strictEqual(resolveLocale("en", ["zh-TW"]), "en");
  assert.strictEqual(resolveLocale("zh-TW", ["en-US"]), "zh-TW");
  assert.strictEqual(resolveLocale("invalid", ["fr-FR", "en-GB"]), "en");
  assert.strictEqual(resolveLocale(null, ["zh-Hant-TW"]), "zh-TW");
  assert.strictEqual(resolveLocale(null, ["ja-JP"]), "en");
  assert.strictEqual(resolveLocale(null), "en");
});

test("theme mode validation and resolution follow system preference or explicit override", () => {
  assert.strictEqual(isThemeMode("system"), true);
  assert.strictEqual(isThemeMode("light"), true);
  assert.strictEqual(isThemeMode("dark"), true);
  assert.strictEqual(isThemeMode("invalid"), false);
  assert.strictEqual(resolveTheme("system", false), "light");
  assert.strictEqual(resolveTheme("system", true), "dark");
  assert.strictEqual(resolveTheme("light", true), "light");
  assert.strictEqual(resolveTheme("dark", false), "dark");
});

test("theme palette validation defaults to Mist Blue and preserves Soft Lavender", () => {
  assert.strictEqual(DEFAULT_THEME_PALETTE, "blue");
  assert.ok(SUPPORTED_THEME_PALETTES.includes("blue"));
  assert.ok(SUPPORTED_THEME_PALETTES.includes("lavender"));
  for (const palette of SUPPORTED_THEME_PALETTES) assert.strictEqual(isThemePalette(palette), true);
  assert.strictEqual(isThemePalette("invalid"), false);
});

test("semantic keys resolve in both languages and interpolation preserves literal code", () => {
  const input = "${value} {count} <script> $&";
  assert.strictEqual(t("home.projectCount", { count: input }), `Projects: ${input}`);
  assert.strictEqual(createTranslator("zh-TW")("home.projectCount", { count: 3 }), "專案數：3");
  assert.strictEqual(t("auth.title"), "Sign in to Course Assignment Platform");
  assert.strictEqual(createTranslator("zh-TW")("auth.title"), "登入課程作業系統");
  assert.strictEqual(t("language.autoDetected", { language: "English" }), "Auto (English)");
  assert.strictEqual(t("home.projectCount"), "Projects: {count}");
  assert.strictEqual(t("home.projectCount", { count: undefined }), "Projects: ");
});

test("unknown keys fall back safely and literal text is rejected by the typed translator", () => {
  // @ts-expect-error Unknown keys must be rejected at compile time.
  assert.strictEqual(t("missing.key"), "missing.key");
  // @ts-expect-error Object prototype properties are not translation keys.
  assert.strictEqual(t("constructor"), "constructor");
  // @ts-expect-error Source text must not be used as a translation key.
  assert.strictEqual(t("登入課程作業系統"), "登入課程作業系統");
  assert.strictEqual(isMessageKey("auth.title"), true);
  assert.strictEqual(isMessageKey("constructor"), false);
  assert.strictEqual(isMessageKey("登入課程作業系統"), false);
});

test("locale dictionaries have identical semantic keys and interpolation parameters", () => {
  assert.deepEqual(
    Object.keys(englishMessages).sort(),
    Object.keys(traditionalChineseMessages).sort(),
  );
  const placeholders = (text: string) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(englishMessages) as MessageKey[]) {
    assert.match(key, /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/);
    assert.ok(englishMessages[key].length > 0, key);
    assert.ok(traditionalChineseMessages[key].length > 0, key);
    assert.deepEqual(
      placeholders(englishMessages[key]),
      placeholders(traditionalChineseMessages[key]),
      key,
    );
  }
});

test("GitHub validation exposes a key that can be translated after a language change", async () => {
  await expect(fetchGitHubProjectBundle("invalid")).rejects.toSatisfy((error: Error) => {
    assert.ok(isMessageKey(error.message));
    assert.strictEqual(
      t(error.message),
      "Enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)",
    );
    assert.strictEqual(
      createTranslator("zh-TW")(error.message),
      "請輸入有效的 GitHub 倉庫網址 (例如 https://github.com/owner/repo)",
    );
    return true;
  });
});

test("built-in assignment briefs are localized independently of student work", () => {
  assert.strictEqual(han.test(JSON.stringify(en)), false);
  for (const [i, project] of en.projects.entries()) {
    assert.strictEqual(project.id, zh.projects[i].id);
    assert.ok(project.content.includes("## Assignment instructions"));
    assert.ok(zh.projects[i].content.includes("## 作業說明"));
    assert.deepEqual(project.attachments, []);
  }
});

const noop = () => {};

test("dashboard lists every project and uses project-only navigation in both languages", () => {
  for (const locale of ["en", "zh-TW"] as const) {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <I18nProvider initialLanguage={locale}>
          <HomeDashboard
            projects={getLocalizedProjects(locale).projects}
            currentUser={testUser}
            onOpenProject={noop}
          />
        </I18nProvider>
      </ThemeProvider>,
    );
    const visibleText = html.replace(/<[^>]*>/g, "");
    const { projects } = getLocalizedProjects(locale);
    assert.ok(!html.includes("ui-code-badge"));
    for (const project of projects) {
      assert.ok(visibleText.includes(renderToStaticMarkup(<>{project.title}</>)));
    }
    assert.notMatch(visibleText, /基礎|進階|Python|Advanced|Recorded edits|編輯紀錄|HW-\d/i);
    const expectedTitle = locale === "en" ? "Project Submission Platform" : "專案繳交平台";
    const expectedWelcome = (locale === "en" ? "Welcome back, " : "歡迎回來，") + testUser.name;
    assert.match(html, /<div class="ui-icon-badge[^"]*">\s*<svg\b[\s\S]*?<h1\b/);
    const headerMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>\s*<p\b[^>]*>([\s\S]*?)<\/p>/);
    assert.ok(headerMatch);
    assert.strictEqual(headerMatch[1], expectedTitle);
    assert.strictEqual(headerMatch[2], renderToStaticMarkup(<>{expectedWelcome}</>));
    for (const removedText of [
      "Project dashboard",
      "專案總覽儀表板 (Dashboard)",
      "Choose a project below to open its workspace.",
      "請選擇下方專案，進入專案工作區",
    ]) {
      assert.ok(!visibleText.includes(removedText));
    }
    assert.ok(
      visibleText.includes(
        locale === "en" ? `Projects: ${projects.length}` : `專案數：${projects.length}`,
      ),
    );
  }
});

test("new workspaces show teacher handouts and start with an empty student README", () => {
  const project = {
    ...en.projects[0],
    content: "# Handout",
    attachments: [{ id: "worksheet", name: "題目.pdf", size: 100 }],
  };
  const html = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <ProjectWorkspace
          project={project}
          snapshot={{ accountId: "student", draft: null, revision: null, updatedAt: null }}
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.match(html, /<h1>Handout<\/h1>/);
  assert.ok(html.includes(`href="/api/projects/${project.id}/attachments/worksheet"`));
  assert.ok(html.includes('download="題目.pdf"'));
  assert.match(html, /<textarea[^>]*><\/textarea>/);
});

test("the project editor renders a saved personal README and repository in the current UI language", () => {
  const html = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="zh-TW">
        <ProjectWorkspace
          project={zh.projects[0]}
          snapshot={{
            accountId: "student",
            revision: "saved",
            updatedAt: null,
            draft: {
              designDoc: "# Private architecture notes",
              repoUrl: "https://github.com/example/my-assignment",
              model: { format: "cap-c4", version: 1, nodes: [], relationships: [] },
            },
          }}
        />
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.match(html, /id="workspace-tab-assignment"[^>]*aria-selected="true"/);
  assert.match(html, /id="workspace-tab-assignment"[^>]*>[\s\S]*?<span>作業說明<\/span><\/button>/);
  assert.ok(
    html.indexOf('id="workspace-tab-assignment"') < html.indexOf('id="workspace-tab-design"'),
  );
  const brief = html
    .split('id="workspace-panel-assignment"')[1]
    .split('id="workspace-panel-design"')[0];
  const briefHeader = brief.split('<div class="px-5 sm:px-8 py-6 space-y-4">')[0];
  assert.match(briefHeader, /<h2[^>]*>作業說明<\/h2>/);
  assert.ok(briefHeader.indexOf("作業說明") < briefHeader.indexOf("截止時間"));
  assert.ok(briefHeader.indexOf("截止時間") < briefHeader.indexOf("配分"));
  assert.notMatch(brief, /繳交項目/);
  assert.match(brief, /<h2>作業說明<\/h2>/);
  assert.notMatch(brief, /Private architecture notes/);
  assert.match(html, /Private architecture notes/);
  assert.match(html, /value="https:\/\/github\.com\/example\/my-assignment"/);
  assert.match(html, /已儲存至你的帳號/);
});

const screens = {
  authGate: (
    <AuthProvider service={stubAuthService}>
      <AuthGate>
        <HomeDashboard projects={en.projects} currentUser={testUser} onOpenProject={noop} />
      </AuthGate>
    </AuthProvider>
  ),
  dashboard: <HomeDashboard projects={en.projects} currentUser={testUser} onOpenProject={noop} />,
  login: <LoginView onLogin={() => stubAuthService.login()} />,
  project: (
    <ProjectWorkspace
      project={en.projects[0]}
      snapshot={{ accountId: "student", draft: null, revision: null, updatedAt: null }}
    />
  ),
  github: <GitHubRepoDashboard repoBundle={bundle} onBranchChange={() => {}} />,
  settingsButton: <SettingsButton />,
  settingsDialog: (
    <SettingsProvider>
      <SettingsDialog />
    </SettingsProvider>
  ),
};

for (const [name, screen] of Object.entries(screens)) {
  test(`${name} renders English UI without untranslated Chinese labels`, () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <I18nProvider initialLanguage="en">{screen}</I18nProvider>
      </ThemeProvider>,
    );
    // The native-language option is intentionally preserved; input values are user data.
    const visibleText = html.replace(/<[^>]*>/g, "").replaceAll("繁體中文", "");
    assert.strictEqual(
      han.test(visibleText),
      false,
      visibleText.match(/.{0,30}[\u3400-\u9fff].{0,60}/g)?.join("\n") ?? "",
    );
  });
}

test("HomeDashboard displays deadlines beneath titles and student status without index badges or points", () => {
  const dueSoonProject = {
    ...en.projects[0],
    dueDate: "2026-11-25 23:59",
    points: 200,
  };
  const overdueProject = {
    ...en.projects[1],
    dueDate: "2026-11-20 12:00",
    points: 150,
  };
  const now = Date.parse("2026-11-25T10:00:00+08:00");
  const savedAt = Date.parse("2026-11-24T18:30:00+08:00");

  const studentHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <SettingsProvider>
        <HomeDashboard
          projects={[dueSoonProject, overdueProject]}
          workspaceStatuses={{
            [dueSoonProject.id]: { hasWorkspace: true, updatedAt: savedAt },
          }}
          currentUser={testUser}
          onOpenProject={noop}
          now={now}
        />
      </SettingsProvider>
    </I18nProvider>,
  );
  const renderedDueSoonTitle = renderToStaticMarkup(<>{dueSoonProject.title}</>);
  assert.match(studentHtml, /<button[^>]*flex items-center gap-3\.5/);
  assert.ok(studentHtml.includes(renderedDueSoonTitle));
  assert.ok(!studentHtml.includes("ui-code-badge"));
  assert.ok(
    studentHtml.indexOf(renderedDueSoonTitle) < studentHtml.indexOf("2026-11-25 23:59 (UTC+8)"),
  );
  assert.ok(studentHtml.includes("2026-11-25 23:59 (UTC+8)"));
  assert.ok(studentHtml.includes("即將截止"));
  assert.ok(studentHtml.includes("已儲存"));
  assert.ok(studentHtml.includes("最後更新 2026-11-24 18:30"));
  assert.ok(studentHtml.includes("已逾期"));
  assert.ok(studentHtml.includes("尚未開始"));
  assert.ok(!studentHtml.includes("配分"));
  assert.ok(!studentHtml.includes(">200<"));
  assert.ok(!studentHtml.includes(">150<"));

  const adminUser: User = { ...testUser, role: "admin" };
  const adminHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <SettingsProvider>
        <HomeDashboard
          projects={[dueSoonProject]}
          workspaceStatuses={{
            [dueSoonProject.id]: { hasWorkspace: true, updatedAt: savedAt },
          }}
          currentUser={adminUser}
          onOpenProject={noop}
          now={now}
        />
      </SettingsProvider>
    </I18nProvider>,
  );
  assert.ok(!adminHtml.includes("ui-code-badge"));
  assert.ok(adminHtml.includes("Due soon"));
  assert.ok(adminHtml.includes("Student projects"));
  assert.ok(!adminHtml.includes("Points"));
  assert.ok(!adminHtml.includes(">Saved<"));
  assert.ok(!adminHtml.includes(">Not started<"));
});
