import { C4FileActions, createC4History } from "@modules/c4-editor";
import { I18nProvider } from "@modules/i18n";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test, vi } from "vite-plus/test";

import { useC4Editor } from "@/modules/c4-editor/hooks/useC4Editor";
import { C4Diagram } from "@/modules/c4-editor/ui/C4Diagram";

vi.mock("@xyflow/react", () => ({
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: "arrowclosed" },
  MiniMap: () => null,
  NodeChangeset: class {},
  NodeResizer: () => null,
  Position: { Left: "left", Right: "right" },
  ReactFlow: ({ children }: { children?: ReactNode }) => <div data-testid="flow">{children}</div>,
}));

function TestC4Diagram() {
  const editor = useC4Editor({
    history: createC4History(),
    dispatchModel: () => {},
    designDoc: "",
    onChangeDesignDoc: () => {},
    designTab: "diagram",
    onChangeDesignTab: () => {},
  });
  return <C4Diagram editor={editor} />;
}

test("C4FileActions renders import/export controls, hidden file input, and status banners", () => {
  const idleHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <C4FileActions
        file={{
          importing: false,
          fileStatus: null,
          exportModel: () => {},
          importModel: async () => {},
        }}
      />
    </I18nProvider>,
  );
  assert.ok(idleHtml.includes("Import C4 JSON"));
  assert.ok(idleHtml.includes("Export C4 JSON"));
  assert.match(idleHtml, /<input[^>]*type="file"[^>]*accept="\.json,application\/json"/);
  assert.notMatch(idleHtml, /role="(?:status|alert)"/);
  assert.notMatch(idleHtml, /disabled=""/);

  const successHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <C4FileActions
        file={{
          importing: false,
          fileStatus: "importSuccess",
          exportModel: () => {},
          importModel: async () => {},
        }}
      />
    </I18nProvider>,
  );
  assert.match(successHtml, /role="status"/);
  assert.ok(successHtml.includes("C4 模型匯入成功。"));
  assert.ok(successHtml.includes("匯入 C4 JSON"));
  assert.ok(successHtml.includes("匯出 C4 JSON"));
  assert.ok(
    successHtml.indexOf("C4 模型匯入成功。") < successHtml.indexOf("匯入 C4 JSON"),
    "status pill appears before right-aligned action buttons",
  );

  for (const [status, expected] of [
    ["importError", "Cannot import this file."],
    ["fileTooLarge", "The file exceeds the 5 MB limit."],
    ["exportError", "Export failed. Please try again."],
  ] as const) {
    const errorHtml = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <C4FileActions
          file={{
            importing: false,
            fileStatus: status,
            exportModel: () => {},
            importModel: async () => {},
          }}
        />
      </I18nProvider>,
    );
    assert.match(errorHtml, /role="alert"/);
    assert.ok(errorHtml.includes(expected));
  }

  const importingHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <C4FileActions
        file={{
          importing: true,
          fileStatus: null,
          exportModel: () => {},
          importModel: async () => {},
        }}
      />
    </I18nProvider>,
  );
  assert.ok(importingHtml.includes("Importing…"));
  assert.strictEqual(importingHtml.match(/disabled=""/g)?.length, 2);
});

test("C4Diagram keeps canvas controls without import/export buttons or file input", () => {
  const html = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram />
    </I18nProvider>,
  );
  assert.ok(html.includes("C1 · Context"));
  assert.ok(html.includes("Undo"));
  assert.ok(html.includes("Redo"));
  assert.ok(html.includes("Help"));
  assert.ok(!html.includes("Import C4 JSON"));
  assert.ok(!html.includes("Export C4 JSON"));
  assert.notMatch(html, /type="file"/);
});
