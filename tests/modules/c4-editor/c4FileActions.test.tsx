import { C4FileActions, createC4History } from "@modules/c4-editor";
import { createC4NodeInScope, type C4Node, type C4Relationship } from "@modules/c4-model";
import { I18nProvider } from "@modules/i18n";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test, vi } from "vite-plus/test";

import { useC4Editor } from "@/modules/c4-editor/hooks/useC4Editor";
import type { CanvasNode } from "@/modules/c4-editor/model/flowTypes";
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
  ReactFlow: ({ children, nodes }: { children?: ReactNode; nodes: CanvasNode[] }) => (
    <div data-testid="flow">
      {nodes.map((node) => node.type === "c4" && <span key={node.id}>{node.data.technology}</span>)}
      {children}
    </div>
  ),
}));

function TestC4Diagram({
  path = [],
  selected,
  nodes = selected ? [...path, selected] : path,
  selectedEdge,
}: {
  path?: C4Node[];
  selected?: C4Node;
  nodes?: C4Node[];
  selectedEdge?: C4Relationship;
}) {
  const editor = useC4Editor({
    history: createC4History({
      nodes,
      relationships: selectedEdge ? [selectedEdge] : [],
    }),
    dispatchModel: () => {},
    designDoc: "",
    onChangeDesignDoc: () => {},
    designTab: "diagram",
    onChangeDesignTab: () => {},
  });
  const scope = path.at(-1);
  if (scope && editor.scope?.id !== scope.id) editor.navigate(scope.id);
  const selectedSourceLabel =
    selectedEdge && nodes.find((node) => node.id === selectedEdge.source)?.label;
  const selectedTargetLabel =
    selectedEdge && nodes.find((node) => node.id === selectedEdge.target)?.label;
  return (
    <C4Diagram
      editor={{
        ...editor,
        selected,
        selectedEdge,
        selectedSourceLabel,
        selectedTargetLabel,
      }}
    />
  );
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

  const systemNode = createC4NodeInScope([], "", "sys", "Core System")!;
  const containerNode = createC4NodeInScope([systemNode], "sys", "ctr", "Web App")!;
  const componentNode = createC4NodeInScope(
    [systemNode, containerNode],
    "ctr",
    "cmp",
    "Auth Service",
  )!;
  const drilledHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram path={[systemNode, containerNode, componentNode]} />
    </I18nProvider>,
  );
  assert.ok(drilledHtml.includes("C1 · Context"));
  assert.ok(drilledHtml.includes("C2 · Container"));
  assert.ok(drilledHtml.includes("C3 · Component"));
  assert.ok(drilledHtml.includes("C4 · Code"));
  assert.ok(!drilledHtml.includes("Core System"));
  assert.ok(!drilledHtml.includes("Web App"));
  assert.ok(!drilledHtml.includes("Auth Service"));
});

test("only C2 and C3 show node technology in both the inspector and the canvas", () => {
  const path: C4Node[] = [];
  for (let level = 1; level <= 4; level++) {
    const node = {
      ...createC4NodeInScope(path, path.at(-1)?.id ?? "", String(level), "Element")!,
      technology: "Example stack",
    };
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <TestC4Diagram path={path} selected={node} />
      </I18nProvider>,
    );
    const inspector = html.split("<aside")[1].split("</aside>")[0];
    assert.ok(inspector.includes(`Edit element · ${level === 1 ? "context" : node.kind}`));
    assert.match(inspector, />Name</);
    assert.match(inspector, />Responsibilities</);
    assert.notMatch(inspector, /role="switch"|GitHub path/);
    const showTechnology = level === 2 || level === 3;
    assert.equal(inspector.includes(">Technology<"), showTechnology);
    assert.equal(html.includes("<span>Example stack</span>"), showTechnology);
    path.push(node);
  }

  const source = createC4NodeInScope([], "", "src", "Core System")!;
  const target = createC4NodeInScope([], "", "dst", "Web App")!;
  const edgeHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram
        nodes={[source, target]}
        selectedEdge={{
          id: "edge-1",
          source: source.id,
          target: target.id,
          label: "Uses",
          technology: "HTTPS",
        }}
      />
    </I18nProvider>,
  );
  const edgeInspector = edgeHtml.split("<aside")[1].split("</aside>")[0];
  assert.ok(edgeInspector.includes("Core System → Web App"));
  assert.ok(edgeInspector.includes(">Relationship description<"));
  assert.ok(!edgeInspector.includes("Technology / protocol"));
  assert.ok(!edgeInspector.includes("ui-panel"));
});
