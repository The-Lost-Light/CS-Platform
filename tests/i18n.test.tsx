import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthProvider } from "@auth/AuthProvider";
import { AuthGate } from "@pages/auth/AuthGate";
import { WorkSpace } from "@pages/Workspace";
import { DEMO_ACCOUNTS } from "@auth/demoAccounts";
import { demoAuthService } from "@auth/demoAuthService";
import { GitHubRepoDashboard } from "@pages/project/GitHubRepoDashboard";
import { ProjectWorkspace } from "@pages/project/ProjectWorkspace";
import { LoginView } from "@pages/auth/LoginView";
import { HomeDashboard } from "@pages/home/HomeDashboard";
import { Navbar } from "@pages/layout/Navbar";
import {
  getLocalizedProjects,
  updateLocalizedProjectDraft,
} from "@data/localizedProjects";
import { I18nProvider } from "@i18n";
import {
  createTranslator,
  englishMessages,
  isMessageKey,
  resolveLocale,
  traditionalChineseMessages,
  type MessageKey,
} from "@i18n/messages";
import { ThemeProvider, isThemeMode, resolveTheme } from "@theme";
import { createRepoFixture } from "./fixtures/repository";
import { fetchGitHubProjectBundle } from "@services/github";

const en = getLocalizedProjects("en");
const zh = getLocalizedProjects("zh-TW");
const t = createTranslator("en");
const han = /[\u3400-\u9fff]/;
const bundle = createRepoFixture();

test("saved language takes priority; unsupported values fall back to browser languages or English", () => {
  assert.equal(resolveLocale("en", ["zh-TW"]), "en");
  assert.equal(resolveLocale("zh-TW", ["en-US"]), "zh-TW");
  assert.equal(resolveLocale("invalid", ["fr-FR", "en-GB"]), "en");
  assert.equal(resolveLocale(null, ["zh-Hant-TW"]), "zh-TW");
  assert.equal(resolveLocale(null, ["ja-JP"]), "en");
  assert.equal(resolveLocale(null), "en");
});

test("theme mode validation and resolution follow system preference or explicit override", () => {
  assert.equal(isThemeMode("system"), true);
  assert.equal(isThemeMode("light"), true);
  assert.equal(isThemeMode("dark"), true);
  assert.equal(isThemeMode("invalid"), false);
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("semantic keys resolve in both languages and interpolation preserves literal code", () => {
  const input = "${value} {count} <script> $&";
  assert.equal(t("common.count", { count: input }), `Count: ${input}`);
  assert.equal(
    createTranslator("zh-TW")("common.count", { count: 3 }),
    "筆數：3",
  );
  assert.equal(t("auth.title"), "Sign in to CodePulse Edu");
  assert.equal(createTranslator("zh-TW")("auth.title"), "登入課程作業系統");
  assert.equal(
    t("language.autoDetected", { language: "English" }),
    "Auto (English)",
  );
  assert.equal(t("common.count"), "Count: {count}");
  assert.equal(t("common.count", { count: undefined }), "Count: ");
});

test("unknown keys fall back safely and literal text is rejected by the typed translator", () => {
  // @ts-expect-error Unknown keys must be rejected at compile time.
  assert.equal(t("missing.key"), "missing.key");
  // @ts-expect-error Object prototype properties are not translation keys.
  assert.equal(t("constructor"), "constructor");
  // @ts-expect-error Source text must not be used as a translation key.
  assert.equal(t("登入課程作業系統"), "登入課程作業系統");
  assert.equal(isMessageKey("auth.title"), true);
  assert.equal(isMessageKey("constructor"), false);
  assert.equal(isMessageKey("登入課程作業系統"), false);
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
  await assert.rejects(fetchGitHubProjectBundle("invalid"), (error: Error) => {
    assert.ok(isMessageKey(error.message));
    assert.equal(
      t(error.message),
      "Enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)",
    );
    assert.equal(
      createTranslator("zh-TW")(error.message),
      "請輸入有效的 GitHub 倉庫網址 (例如 https://github.com/owner/repo)",
    );
    return true;
  });
});

test("all built-in project text is translated and path mappings remain unchanged", () => {
  assert.equal(han.test(JSON.stringify(en)), false);
  for (const [i, project] of en.projects.entries()) {
    assert.deepEqual(
      project.initialMindMapNodes.map(({ id, expectedPath }) => ({
        id,
        expectedPath,
      })),
      zh.projects[i].initialMindMapNodes.map(({ id, expectedPath }) => ({
        id,
        expectedPath,
      })),
    );
  }
});

test("language changes preserve custom nodes, edited fields, deleted nodes, paths and positions", () => {
  const before = zh.projects[0];
  const after = en.projects[0];
  const nodes = before.initialMindMapNodes
    .slice(0, 3)
    .map((node) => ({ ...node }));
  nodes[1].label = "我自己改的標題";
  nodes[1].expectedPath = "src/custom.ts";
  nodes[1].x = 222;
  nodes.push({ ...nodes[0], id: "custom", label: "My custom module" });
  const doc = before.initialDesignDoc + "\nMy notes";
  const result = updateLocalizedProjectDraft(nodes, doc, before, after);
  assert.equal(result.nodes.length, nodes.length);
  assert.equal(result.nodes[0].label, after.initialMindMapNodes[0].label);
  assert.equal(result.nodes[1].label, nodes[1].label);
  assert.equal(
    result.nodes[1].description,
    after.initialMindMapNodes[1].description,
  );
  assert.equal(result.nodes[1].expectedPath, "src/custom.ts");
  assert.equal(result.nodes[1].x, 222);
  assert.deepEqual(result.nodes[3], nodes[3]);
  assert.equal(result.designDoc, doc);
  const pristine = updateLocalizedProjectDraft(
    before.initialMindMapNodes,
    before.initialDesignDoc,
    before,
    after,
  );
  assert.deepEqual(pristine.nodes, after.initialMindMapNodes);
  assert.equal(pristine.designDoc, after.initialDesignDoc);
  const roundTrip = updateLocalizedProjectDraft(
    result.nodes,
    result.designDoc,
    after,
    before,
  );
  assert.deepEqual(roundTrip.nodes, nodes);
  assert.equal(roundTrip.designDoc, doc);
});

const noop = () => {};

test("dashboard lists every project and uses project-only navigation in both languages", () => {
  for (const locale of ["en", "zh-TW"] as const) {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <I18nProvider initialLanguage={locale}>
          <Navbar
            activeView="home"
            selectedProject={null}
            onNavigateHome={noop}
            onSelectProjectDefault={noop}
            currentUser={DEMO_ACCOUNTS[0]}
            onLogout={noop}
          />
          <HomeDashboard
            projects={getLocalizedProjects(locale).projects}
            currentUser={DEMO_ACCOUNTS[0]}
            onOpenProject={noop}
          />
        </I18nProvider>
      </ThemeProvider>,
    );
    const visibleText = html.replace(/<[^>]*>/g, "");
    const { projects } = getLocalizedProjects(locale);
    for (const project of projects) {
      assert.ok(visibleText.includes(project.codeName));
      assert.ok(
        visibleText.includes(renderToStaticMarkup(<>{project.title}</>)),
      );
    }
    assert.doesNotMatch(
      visibleText,
      /基礎|進階|Python|Advanced|Recorded edits|編輯紀錄|HW-\d/i,
    );
    assert.ok(
      visibleText.includes(
        locale === "en" ? "Project overview" : "專案總覽首頁",
      ),
    );
    assert.ok(
      visibleText.includes(
        locale === "en"
          ? `Projects: ${projects.length}`
          : `專案數：${projects.length}`,
      ),
    );
  }
});

const screens = {
  authGate: (
    <AuthProvider>
      <AuthGate>{(session) => <WorkSpace {...session} />}</AuthGate>
    </AuthProvider>
  ),
  dashboard: (
    <HomeDashboard
      projects={en.projects}
      currentUser={DEMO_ACCOUNTS[0]}
      onOpenProject={noop}
    />
  ),
  login: <LoginView onLogin={demoAuthService.login} />,
  project: <ProjectWorkspace project={en.projects[0]} />,
  github: <GitHubRepoDashboard repoBundle={bundle} />,
};

for (const [name, screen] of Object.entries(screens)) {
  test(`${name} renders English UI without untranslated Chinese labels`, () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <I18nProvider initialLanguage="en">{screen}</I18nProvider>
      </ThemeProvider>,
    );
    // Names and the native-language option are intentionally preserved; input values are user data.
    const visibleText = html
      .replace(/<[^>]*>/g, "")
      .replaceAll("繁體中文", "")
      .replaceAll("陳宥軒 (資工三甲)", "")
      .replaceAll("林博宇 (資工三乙)", "")
      .replaceAll("張簡助教 (Course TA)", "")
      .replace(/[陳林張]/g, "");
    assert.equal(
      han.test(visibleText),
      false,
      visibleText.match(/.{0,30}[\u3400-\u9fff].{0,60}/g)?.join("\n") ?? "",
    );
  });
}
