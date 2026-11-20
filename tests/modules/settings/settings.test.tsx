import { I18nProvider } from "@modules/i18n";
import { getLocalizedProjects } from "@modules/projects";
import { SettingsButton, SettingsDialog, SettingsProvider } from "@modules/settings";
import { ThemeProvider } from "@modules/theme";
import { ProjectWorkspace } from "@modules/workspace";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

const enProjects = getLocalizedProjects("en").projects;

test("SettingsDialog renders localized language, dark mode, and palette settings for signed-in users", () => {
  const enHtml = renderToStaticMarkup(
    <ThemeProvider initialMode="dark" initialPalette="sage">
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <SettingsDialog
            account={{
              id: "student-1",
              name: "Student",
              email: "student@example.com",
              role: "user",
            }}
          />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );

  for (const label of [
    "Settings",
    "Edit current account",
    "student@example.com",
    "Language",
    "Appearance",
    "Color palette",
    "Mist Blue",
    "Soft Lavender",
    "Mist Sage",
    "Frosted Slate",
  ]) {
    assert.ok(enHtml.includes(label), `missing English label: ${label}`);
  }
  assert.notMatch(enHtml, /GitHub Token|Personal Access Token/i);
  assert.ok(enHtml.includes("ui-setting-section"));
  assert.ok(enHtml.includes("ui-setting-trigger"));
  assert.ok(enHtml.includes("ui-setting-value-cell"));
  assert.ok(enHtml.includes("ui-setting-value-pill"));
  assert.ok(enHtml.includes("ui-choice-card"));
  assert.notMatch(enHtml, /<footer\b/);
  assert.ok(!enHtml.includes(">Done<"));
  const enHeader = enHtml.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1] ?? "";
  assert.notMatch(enHeader, /<p\b/);
  assert.ok(!enHtml.includes("Sign out"));
  const enTriggers = Array.from(enHtml.matchAll(/<button[^>]*class="ui-setting-trigger"[^>]*>/g));
  assert.strictEqual(enTriggers.length, 3);
  for (const [trigger] of enTriggers) {
    assert.ok(trigger.includes('aria-expanded="false"'));
  }
  const enPanels = Array.from(enHtml.matchAll(/<div id="[^"]*-panel"[^>]*>/g));
  assert.strictEqual(enPanels.length, 3);
  for (const [panel] of enPanels) {
    assert.ok(panel.includes("hidden="));
  }

  const expandedPaletteHtml = renderToStaticMarkup(
    <ThemeProvider initialMode="dark" initialPalette="sage">
      <I18nProvider initialLanguage="en">
        <SettingsProvider initialExpandedSection="palette">
          <SettingsDialog />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  const expandedTriggers = Array.from(
    expandedPaletteHtml.matchAll(/<button[^>]*class="ui-setting-trigger"[^>]*>/g),
  );
  assert.strictEqual(expandedTriggers.length, 3);
  assert.strictEqual(
    expandedTriggers.filter(([trigger]) => trigger.includes('aria-expanded="true"')).length,
    1,
  );
  assert.ok(expandedTriggers[2][0].includes('aria-expanded="true"'));
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
  ]) {
    assert.ok(zhHtml.includes(label), `missing Chinese label: ${label}`);
  }
  assert.notMatch(zhHtml, /<footer\b/);
  assert.ok(!zhHtml.includes(">完成<"));
});

test("SettingsDialog shows general preferences to guests", () => {
  const html = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <SettingsDialog />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );

  assert.ok(html.includes("Language"));
  assert.ok(html.includes("Appearance"));
  assert.ok(html.includes("Color palette"));
  assert.ok(!html.includes("Project Repo GitHub Token"));
  assert.ok(!html.includes("Personal Access Token"));
  assert.ok(!html.includes("Edit current account"));
  assert.ok(!html.includes("Sign out"));
});

test("SettingsButton and ProjectWorkspace render without a personal token", () => {
  const buttonHtml = renderToStaticMarkup(
    <ThemeProvider>
      <I18nProvider initialLanguage="en">
        <SettingsProvider>
          <SettingsButton />
        </SettingsProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  assert.ok(buttonHtml.includes('aria-haspopup="dialog"'));
  assert.ok(buttonHtml.includes(">Settings<"));
  assert.ok(!buttonHtml.includes("Mist Blue"));

  const workspaceHtml = renderToStaticMarkup(
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
  assert.ok(workspaceHtml.includes("Sync GitHub project data"));
  assert.ok(workspaceHtml.includes('href="/"'));
  assert.ok(workspaceHtml.includes('aria-label="Back to home"'));
  assert.notMatch(workspaceHtml, /token|Configure in Settings|type="password"/i);
});
