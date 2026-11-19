import { Navbar } from "@app/Navbar";
import { LoginView, DEMO_ACCOUNTS, demoAuthService } from "@modules/auth";
import { I18nProvider } from "@modules/i18n";
import { getLocalizedProjects } from "@modules/projects";
import {
  GITHUB_TOKEN_STORAGE_PREFIX,
  githubTokenStorageKey,
  normalizeGithubToken,
  SettingsButton,
  SettingsDialog,
  SettingsProvider,
} from "@modules/settings";
import { ThemeProvider } from "@modules/theme";
import { ProjectWorkspace } from "@modules/workspace";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

const enProjects = getLocalizedProjects("en").projects;

test("githubTokenStorageKey scopes storage by account and normalizes tokens", () => {
  assert.strictEqual(githubTokenStorageKey(null), null);
  assert.strictEqual(githubTokenStorageKey(undefined), GITHUB_TOKEN_STORAGE_PREFIX);
  assert.strictEqual(githubTokenStorageKey("   "), null);
  assert.strictEqual(githubTokenStorageKey(" user-42 "), `${GITHUB_TOKEN_STORAGE_PREFIX}.user-42`);
  assert.strictEqual(normalizeGithubToken("  ghp_secret123 \n "), "ghp_secret123");
});

test("SettingsDialog renders localized language, dark mode, palette, and GitHub token sections", () => {
  const enHtml = renderToStaticMarkup(
    <ThemeProvider initialMode="dark" initialPalette="sage">
      <I18nProvider initialLanguage="en">
        <SettingsProvider initialGithubToken="ghp_test_token">
          <SettingsDialog />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );

  for (const label of [
    "Settings",
    "Language",
    "Appearance",
    "Color palette",
    "Mist Blue",
    "Soft Lavender",
    "Mist Sage",
    "Frosted Slate",
    "Project Repo GitHub Token",
    "Configured",
    "Clear token",
  ]) {
    assert.ok(enHtml.includes(label), `missing English label: ${label}`);
  }
  assert.ok(enHtml.includes('value="ghp_test_token"'));
  assert.ok(enHtml.includes("ui-setting-section"));
  assert.ok(enHtml.includes("ui-setting-trigger"));
  assert.ok(enHtml.includes("ui-setting-value-cell"));
  assert.ok(enHtml.includes("ui-setting-value-pill"));
  assert.ok(enHtml.includes("ui-choice-card"));
  assert.notMatch(enHtml, /<footer\b/);
  assert.ok(!enHtml.includes(">Done<"));
  const enHeader = enHtml.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1] ?? "";
  assert.notMatch(enHeader, /<p\b/);
  const enTriggers = Array.from(enHtml.matchAll(/<button[^>]*class="ui-setting-trigger"[^>]*>/g));
  assert.strictEqual(enTriggers.length, 4);
  for (const [trigger] of enTriggers) {
    assert.ok(trigger.includes('aria-expanded="false"'));
  }
  const enPanels = Array.from(enHtml.matchAll(/<div id="[^"]*-panel"[^>]*>/g));
  assert.strictEqual(enPanels.length, 4);
  for (const [panel] of enPanels) {
    assert.ok(panel.includes("hidden="));
  }

  const expandedGithubHtml = renderToStaticMarkup(
    <ThemeProvider initialMode="dark" initialPalette="sage">
      <I18nProvider initialLanguage="en">
        <SettingsProvider initialGithubToken="ghp_test_token" initialExpandedSection="github">
          <SettingsDialog />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  const expandedTriggers = Array.from(
    expandedGithubHtml.matchAll(/<button[^>]*class="ui-setting-trigger"[^>]*>/g),
  );
  assert.strictEqual(expandedTriggers.length, 4);
  assert.strictEqual(
    expandedTriggers.filter(([trigger]) => trigger.includes('aria-expanded="true"')).length,
    1,
  );
  assert.ok(expandedTriggers[3][0].includes('aria-expanded="true"'));
  assert.ok(expandedTriggers[0][0].includes('aria-expanded="false"'));

  const zhHtml = renderToStaticMarkup(
    <ThemeProvider initialMode="light" initialPalette="blue">
      <I18nProvider initialLanguage="zh-TW">
        <SettingsProvider>
          <SettingsDialog />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );

  for (const label of [
    "設定",
    "語言",
    "深淺色模式",
    "主題配色",
    "霧感淡藍",
    "霧感淡紫",
    "霧感淡綠",
    "霧感冷灰",
    "專案 Repo GitHub Token",
    "未設定",
    "清除 Token",
  ]) {
    assert.ok(zhHtml.includes(label), `missing Chinese label: ${label}`);
  }
  assert.notMatch(zhHtml, /<footer\b/);
  assert.ok(!zhHtml.includes(">完成<"));
});

test("SettingsDialog hides the GitHub token section when unauthenticated", () => {
  const html = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <SettingsDialog showGithubToken={false} />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );

  assert.ok(html.includes("Language"));
  assert.ok(html.includes("Appearance"));
  assert.ok(html.includes("Color palette"));
  assert.ok(!html.includes("Project Repo GitHub Token"));
  assert.ok(!html.includes("Personal Access Token"));
});

test("Navbar, LoginView, and ProjectWorkspace integrate SettingsButton and Settings token state", () => {
  const navHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <Navbar
            activeView="home"
            selectedProject={null}
            onNavigateHome={() => {}}
            onSelectProjectDefault={() => {}}
            currentUser={DEMO_ACCOUNTS[0]}
            onLogout={() => {}}
          />
          <SettingsButton variant="elevated" />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(navHtml.includes('aria-haspopup="dialog"'));
  assert.ok(navHtml.includes(">Settings<"));
  assert.ok(!navHtml.includes("Mist Blue"));

  const loginHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <LoginView onLogin={(input) => demoAuthService.login(input)} />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(loginHtml.includes('aria-haspopup="dialog"'));
  assert.ok(loginHtml.includes(">Settings<"));

  const workspaceConfiguredHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <SettingsProvider initialGithubToken="ghp_test">
          <ProjectWorkspace
            project={enProjects[0]}
            snapshot={{ accountId: "student", draft: null, revision: null }}
          />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(workspaceConfiguredHtml.includes("GitHub token configured"));
  assert.ok(workspaceConfiguredHtml.includes("Configure in Settings"));
  assert.ok(!workspaceConfiguredHtml.includes('type="password"'));

  const workspacePublicHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <ProjectWorkspace
            project={enProjects[0]}
            snapshot={{ accountId: "student", draft: null, revision: null }}
          />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(workspacePublicHtml.includes("Public GitHub API (no token)"));
});
