import { I18nProvider } from "@modules/i18n";
import { getLocalizedProjects } from "@modules/projects";
import { ThemeProvider } from "@modules/theme";
import { ProjectWorkspace } from "@modules/workspace";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

const enProject = getLocalizedProjects("en").projects[0];
const zhProject = getLocalizedProjects("zh-TW").projects[0];
const emptySnapshot = { accountId: "student", draft: null, revision: null };

test("Repo tab renders the URL and sync button in the workspace header card", () => {
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
  assert.equal(header.match(/class="ui-card\b/g)?.length, 1);
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
