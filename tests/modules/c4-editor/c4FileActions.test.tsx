import { C4FileActions, createC4History, reduceC4History } from "@modules/c4-editor";
import {
  BOUNDARY_ID,
  C4_MAX_NODES,
  C4_NODE_FIELD_LIMITS,
  C4_RELATIONSHIP_FIELD_LIMITS,
  createC4NodeInScope,
  type C4Node,
  type C4Relationship,
} from "@modules/c4-model";
import { I18nProvider } from "@modules/i18n";
import { MAX_DESIGN_DOC_LENGTH } from "@shared/workspacePolicy";
import { useReducer, useRef, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test, vi } from "vite-plus/test";

import { useC4Editor, type C4ContextMenu } from "@/modules/c4-editor/hooks/useC4Editor";
import type { CanvasNode } from "@/modules/c4-editor/model/flowTypes";
import { C4Diagram } from "@/modules/c4-editor/ui/C4Diagram";
import { DesignDocument } from "@/modules/c4-editor/ui/DesignDocument";

type ContextMenuEvent = {
  preventDefault: () => void;
  stopPropagation: () => void;
  clientX: number;
  clientY: number;
};
interface FlowInteractions {
  onPaneClick?: (event: unknown) => void;
  onPaneContextMenu?: (event: Pick<ContextMenuEvent, "preventDefault">) => void;
  onNodeClick?: (event: unknown, node: CanvasNode) => void;
  onNodeContextMenu?: (event: ContextMenuEvent, node: CanvasNode) => void;
  onEdgeClick?: (event: unknown, edge: { id: string }) => void;
  onEdgeContextMenu?: (event: ContextMenuEvent, edge: { id: string }) => void;
  onMoveStart?: () => void;
  elementsSelectable?: boolean;
  selectNodesOnDrag?: boolean;
  nodesFocusable?: boolean;
  edgesFocusable?: boolean;
}
let flowProps: FlowInteractions = {};
const boundary: CanvasNode = {
  id: BOUNDARY_ID,
  type: "boundary",
  position: { x: 0, y: 0 },
  data: { title: "Boundary" },
};

vi.mock("@xyflow/react", () => ({
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: "arrowclosed" },
  MiniMap: () => null,
  NodeChangeset: class {},
  NodeResizer: () => null,
  Position: { Left: "left", Right: "right" },
  ReactFlow: ({
    children,
    nodes,
    ...interactions
  }: FlowInteractions & {
    children?: ReactNode;
    nodes: CanvasNode[];
  }) => {
    flowProps = interactions;
    return (
      <div data-testid="flow">
        {nodes.map(
          (node) => node.type === "c4" && <span key={node.id}>{node.data.technology}</span>,
        )}
        {children}
      </div>
    );
  },
}));

function TestC4Diagram({
  path = [],
  selected,
  nodes = selected ? [...path, selected] : path,
  selectedEdge,
  creating,
  readOnly,
  contextMenu,
  setSelectedId,
  setEdgeId,
  setContextMenu,
}: {
  path?: C4Node[];
  selected?: C4Node;
  nodes?: C4Node[];
  selectedEdge?: C4Relationship;
  creating?: boolean;
  readOnly?: boolean;
  contextMenu?: C4ContextMenu | null;
  setSelectedId?: (id: string) => void;
  setEdgeId?: (id: string) => void;
  setContextMenu?: (next: C4ContextMenu | null) => void;
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
    readOnly,
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
        drawing: creating === undefined ? editor.drawing : { ...editor.drawing, creating },
        contextMenu: contextMenu === undefined ? editor.contextMenu : contextMenu,
        setSelectedId: setSelectedId ?? editor.setSelectedId,
        setEdgeId: setEdgeId ?? editor.setEdgeId,
        setContextMenu: setContextMenu ?? editor.setContextMenu,
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
  assert.match(html, /<button[^>]*aria-pressed="false"[^>]*>[\s\S]*Create node<\/button>/);
  assert.ok(html.includes("Undo"));
  assert.ok(html.includes("Redo"));
  assert.ok(html.includes("Help"));
  assert.ok(!html.includes("Import C4 JSON"));
  assert.ok(!html.includes("Export C4 JSON"));
  assert.notMatch(html, /type="file"/);
  assert.strictEqual(flowProps.elementsSelectable, false);
  assert.strictEqual(flowProps.selectNodesOnDrag, false);
  assert.strictEqual(flowProps.nodesFocusable, false);
  assert.strictEqual(flowProps.edgesFocusable, false);

  const creatingHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram creating />
    </I18nProvider>,
  );
  assert.match(creatingHtml, /<button[^>]*aria-pressed="true"[^>]*>[\s\S]*Create node<\/button>/);

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
    assert.ok(!inspector.includes("Delete element and descendants"));
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
  assert.ok(!edgeInspector.includes("Delete relationship"));
  assert.ok(!edgeInspector.includes("Technology / protocol"));
  assert.ok(!edgeInspector.includes("ui-panel"));
});

test("C4Diagram renders a node context menu with Edit and Delete actions", () => {
  const node = createC4NodeInScope([], "", "node-1", "System")!;
  for (const [locale, editLabel, deleteLabel] of [
    ["en", "Edit", "Delete"],
    ["zh-TW", "編輯", "刪除"],
  ] as const) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage={locale}>
        <TestC4Diagram nodes={[node]} contextMenu={{ nodeId: node.id, x: 120, y: 80 }} />
      </I18nProvider>,
    );
    const menu = html.match(/<div[^>]*role="menu"[^>]*>[\s\S]*?<\/div>/)?.[0] ?? "";
    assert.ok(menu.includes("left:120px;top:80px"));
    assert.match(menu, new RegExp(`role="menuitem"[\\s\\S]*?>${editLabel}<`));
    assert.match(menu, new RegExp(`role="menuitem"[\\s\\S]*?>${deleteLabel}<`));
  }
});

test("clicking outside the currently edited node closes the edit inspector while panning keeps it open", () => {
  const node = createC4NodeInScope([], "", "node-1", "System")!;
  const other = createC4NodeInScope([], "", "node-2", "Database")!;
  const relationship: C4Relationship = {
    id: "edge-1",
    source: node.id,
    target: other.id,
    label: "Uses",
    technology: "",
  };
  const flowNode = (item: C4Node): CanvasNode => ({
    id: item.id,
    type: "c4",
    position: { x: 0, y: 0 },
    data: {
      title: item.label,
      description: "",
      technology: "",
      expandable: false,
    },
  });

  function renderInspectorState({
    selected,
    selectedEdge,
    contextMenu,
    onClearSelected,
    onClearEdge,
    onChangeMenu,
  }: {
    selected?: C4Node;
    selectedEdge?: C4Relationship;
    contextMenu: C4ContextMenu | null;
    onClearSelected: (id: string) => void;
    onClearEdge: (id: string) => void;
    onChangeMenu: (next: C4ContextMenu | null) => void;
  }) {
    return renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <TestC4Diagram
          nodes={[node, other]}
          selected={selected}
          selectedEdge={selectedEdge}
          contextMenu={contextMenu}
          setSelectedId={onClearSelected}
          setEdgeId={onClearEdge}
          setContextMenu={onChangeMenu}
        />
      </I18nProvider>,
    );
  }

  const setup = (initialEdge?: C4Relationship) => {
    let selectedNode: C4Node | undefined = node;
    let edge: C4Relationship | undefined = initialEdge;
    let menu: C4ContextMenu | null = { nodeId: node.id, x: 10, y: 20 };
    const setSelectedId = vi.fn((id: string) => {
      selectedNode = [node, other].find((item) => item.id === id);
    });
    const html = renderInspectorState({
      selected: selectedNode,
      selectedEdge: edge,
      contextMenu: menu,
      onClearSelected: setSelectedId,
      onClearEdge: (id) => {
        if (!id) edge = undefined;
      },
      onChangeMenu: (next) => {
        menu = next;
      },
    });
    assert.ok(html.includes("<aside"));
    return {
      state: () => ({ selectedNode, edge, menu }),
      setSelectedId,
    };
  };

  // Panning the canvas closes only the context menu, keeping the edit inspector open.
  const panRun = setup(relationship);
  flowProps.onMoveStart?.();
  assert.strictEqual(panRun.state().menu, null);
  assert.strictEqual(panRun.state().selectedNode, node);
  assert.strictEqual(panRun.state().edge, relationship);

  // Clicking the currently edited node keeps the edit inspector open.
  const selfClickRun = setup();
  flowProps.onNodeClick?.({}, flowNode(node));
  assert.strictEqual(selfClickRun.state().menu, null);
  assert.strictEqual(selfClickRun.state().selectedNode, node);

  // Clicking a different C4 node closes the edit inspector.
  const otherClickRun = setup();
  flowProps.onNodeClick?.({}, flowNode(other));
  assert.strictEqual(otherClickRun.state().menu, null);
  assert.strictEqual(otherClickRun.state().selectedNode, undefined);
  assert.ok(
    !renderInspectorState({
      selected: otherClickRun.state().selectedNode,
      selectedEdge: otherClickRun.state().edge,
      contextMenu: otherClickRun.state().menu,
      onClearSelected: () => {},
      onClearEdge: () => {},
      onChangeMenu: () => {},
    }).includes("<aside"),
  );

  // Clicking empty canvas pane closes the edit inspector.
  const paneClickRun = setup(relationship);
  flowProps.onPaneClick?.({});
  assert.strictEqual(paneClickRun.state().selectedNode, undefined);
  assert.strictEqual(paneClickRun.state().edge, undefined);
  assert.ok(
    !renderInspectorState({
      selected: paneClickRun.state().selectedNode,
      selectedEdge: paneClickRun.state().edge,
      contextMenu: paneClickRun.state().menu,
      onClearSelected: () => {},
      onClearEdge: () => {},
      onChangeMenu: () => {},
    }).includes("<aside"),
  );

  // Clicking the frame dismisses the inspector and clears the edited node.
  const boundaryClickRun = setup(relationship);
  flowProps.onNodeClick?.({}, boundary);
  assert.deepEqual(boundaryClickRun.setSelectedId.mock.calls, [[""]]);
  assert.strictEqual(boundaryClickRun.state().menu, null);
  assert.strictEqual(boundaryClickRun.state().selectedNode, undefined);
  assert.strictEqual(boundaryClickRun.state().edge, undefined);

  // Right-clicking empty canvas or another node closes the edit inspector.
  const paneContextRun = setup(relationship);
  flowProps.onPaneContextMenu?.({ preventDefault: () => {} });
  assert.strictEqual(paneContextRun.state().menu, null);
  assert.strictEqual(paneContextRun.state().selectedNode, undefined);
  assert.strictEqual(paneContextRun.state().edge, undefined);

  const otherContextRun = setup();
  flowProps.onNodeContextMenu?.(
    { preventDefault: () => {}, stopPropagation: () => {}, clientX: 50, clientY: 60 },
    flowNode(other),
  );
  assert.strictEqual(otherContextRun.state().selectedNode, undefined);
  assert.deepEqual(otherContextRun.state().menu, { nodeId: other.id, x: 50, y: 60 });

  // Clicking or right-clicking an edge never opens C4Inspector on left-click,
  // closes a different element's inspector, and opens the edge context menu on right-click.
  let edgeOnlySelected: C4Node | undefined = node;
  let edgeOnlyCurrent: C4Relationship | undefined = relationship;
  let edgeOnlyMenu: C4ContextMenu | null = null;
  renderInspectorState({
    selected: edgeOnlySelected,
    selectedEdge: edgeOnlyCurrent,
    contextMenu: edgeOnlyMenu,
    onClearSelected: (id) => {
      if (!id) edgeOnlySelected = undefined;
    },
    onClearEdge: (id) => {
      if (!id) edgeOnlyCurrent = undefined;
    },
    onChangeMenu: (next) => {
      edgeOnlyMenu = next;
    },
  });
  flowProps.onEdgeClick?.({}, { id: relationship.id });
  assert.strictEqual(edgeOnlySelected, undefined);
  assert.strictEqual(edgeOnlyCurrent, relationship);
  assert.strictEqual(edgeOnlyMenu, null);

  flowProps.onEdgeClick?.({}, { id: "other-edge" });
  assert.strictEqual(edgeOnlyCurrent, undefined);

  edgeOnlySelected = node;
  edgeOnlyCurrent = undefined;
  renderInspectorState({
    selected: edgeOnlySelected,
    selectedEdge: edgeOnlyCurrent,
    contextMenu: edgeOnlyMenu,
    onClearSelected: (id) => {
      if (!id) edgeOnlySelected = undefined;
    },
    onClearEdge: (id) => {
      if (!id) edgeOnlyCurrent = undefined;
    },
    onChangeMenu: (next) => {
      edgeOnlyMenu = next;
    },
  });
  flowProps.onEdgeContextMenu?.(
    { preventDefault: () => {}, stopPropagation: () => {}, clientX: 70, clientY: 90 },
    { id: relationship.id },
  );
  assert.strictEqual(edgeOnlySelected, undefined);
  assert.deepEqual(edgeOnlyMenu, { edgeId: relationship.id, x: 70, y: 90 });

  const edgeMenuHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <TestC4Diagram
        nodes={[node, other]}
        contextMenu={{ edgeId: relationship.id, x: 70, y: 90 }}
      />
    </I18nProvider>,
  );
  assert.match(edgeMenuHtml, /role="menu"[\s\S]*>編輯<[\s\S]*>刪除</);
});

test("read-only C4Diagram hides editing toolbar actions, context menu, and inspector", () => {
  const node = createC4NodeInScope([], "", "node-1", "System")!;
  const setSelectedId = vi.fn();
  const readOnlyEmptyHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram readOnly />
    </I18nProvider>,
  );
  assert.ok(readOnlyEmptyHtml.includes("C1 · Context"));
  assert.ok(readOnlyEmptyHtml.includes("Help"));
  assert.ok(readOnlyEmptyHtml.includes("No elements at this level."));
  assert.ok(!readOnlyEmptyHtml.includes("Create node</button>"));
  assert.ok(!readOnlyEmptyHtml.includes(">Undo</button>"));
  assert.ok(!readOnlyEmptyHtml.includes(">Redo</button>"));

  const readOnlySelectedHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram
        path={[node]}
        selected={node}
        nodes={[node]}
        setSelectedId={setSelectedId}
        contextMenu={{ nodeId: node.id, x: 20, y: 20 }}
        readOnly
      />
    </I18nProvider>,
  );
  assert.ok(!readOnlySelectedHtml.includes("<aside"));
  assert.ok(!readOnlySelectedHtml.includes('role="menu"'));
  flowProps.onNodeClick?.({}, boundary);
  assert.lengthOf(setSelectedId.mock.calls, 0);
});

test("editor UI enforces maxLength attributes and disables Create node at C4_MAX_NODES", () => {
  const systemNode = createC4NodeInScope([], "", "sys", "Core System")!;
  const containerNode = createC4NodeInScope([systemNode], "sys", "ctr", "Web App")!;
  const edge: C4Relationship = {
    id: "edge-1",
    source: systemNode.id,
    target: containerNode.id,
    label: "Uses",
    technology: "HTTPS",
  };

  const nodeInspectorHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram path={[systemNode]} selected={containerNode} />
    </I18nProvider>,
  )
    .split("<aside")[1]
    .split("</aside>")[0];
  assert.ok(nodeInspectorHtml.includes(`maxLength="${C4_NODE_FIELD_LIMITS.label}"`));
  assert.ok(nodeInspectorHtml.includes(`maxLength="${C4_NODE_FIELD_LIMITS.technology}"`));
  assert.ok(nodeInspectorHtml.includes(`maxLength="${C4_NODE_FIELD_LIMITS.description}"`));

  const edgeInspectorHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram nodes={[systemNode, containerNode]} selectedEdge={edge} />
    </I18nProvider>,
  )
    .split("<aside")[1]
    .split("</aside>")[0];
  assert.ok(edgeInspectorHtml.includes(`maxLength="${C4_RELATIONSHIP_FIELD_LIMITS.label}"`));

  const maxNodes = Array.from({ length: C4_MAX_NODES }, (_, index) => ({
    ...systemNode,
    id: `n-${index}`,
  }));
  const maxedHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <TestC4Diagram nodes={maxNodes} />
    </I18nProvider>,
  );
  const createButton = maxedHtml.match(/<button[^>]*>[\s\S]*?Create node<\/button>/)?.[0] ?? "";
  assert.ok(createButton.includes('disabled=""'));

  const designHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <DesignDocument
        designDoc=""
        onChangeDesignDoc={() => {}}
        readmeMode="source"
        setReadmeMode={() => {}}
      />
    </I18nProvider>,
  );
  assert.ok(designHtml.includes(`maxLength="${MAX_DESIGN_DOC_LENGTH}"`));
});

test("creating a node or connection opens C4Inspector for the new element", () => {
  function StatefulEditorHarness({
    initialNodes = [],
    run,
  }: {
    initialNodes?: C4Node[];
    run: (editor: ReturnType<typeof useC4Editor>) => void;
  }) {
    const [history, dispatchModel] = useReducer(
      reduceC4History,
      { nodes: initialNodes, relationships: [] },
      createC4History,
    );
    const editor = useC4Editor({
      history,
      dispatchModel,
      designDoc: "",
      onChangeDesignDoc: () => {},
      designTab: "diagram",
      onChangeDesignTab: () => {},
    });
    const ran = useRef(false);
    if (!ran.current) {
      ran.current = true;
      run(editor);
    }
    return <C4Diagram editor={editor} />;
  }

  const nodeHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <StatefulEditorHarness
        run={(editor) => {
          editor.addNode({ x: 100, y: 120 });
        }}
      />
    </I18nProvider>,
  );
  const nodeInspector = nodeHtml.split("<aside")[1]?.split("</aside>")[0] ?? "";
  assert.ok(nodeInspector.includes("Edit element · context"));
  assert.ok(nodeInspector.includes('value="New element"'));

  const source = createC4NodeInScope([], "", "src", "Core System")!;
  const target = createC4NodeInScope([], "", "dst", "Web App")!;
  const edgeHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <StatefulEditorHarness
        initialNodes={[source, target]}
        run={(editor) => {
          editor.connect({
            source: source.id,
            target: target.id,
            sourceHandle: null,
            targetHandle: null,
          });
        }}
      />
    </I18nProvider>,
  );
  const edgeInspector = edgeHtml.split("<aside")[1]?.split("</aside>")[0] ?? "";
  assert.ok(edgeInspector.includes("Edit relationship"));
  assert.ok(edgeInspector.includes("Core System → Web App"));
  assert.ok(edgeInspector.includes('value="Uses"'));
});
