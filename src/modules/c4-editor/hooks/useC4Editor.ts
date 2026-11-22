import {
  c4Drilldown,
  canExploreC4Node,
  createC4NodeInScope,
  type C4Node,
  type C4Relationship,
} from "@modules/c4-model";
import { useI18n } from "@modules/i18n";
import { type Connection, type NodeChangeset, type ReactFlowInstance } from "@xyflow/react";
import { useRef, useState } from "react";

import { applyCanvasLayout, toModelPosition } from "../model/canvasLayout";
import { buildFlowElements } from "../model/flowElements";
import type { CanvasNode } from "../model/flowTypes";
import { removeC4Elements, type C4Graph } from "../model/modelHistory";
import type { C4ArchitectProps } from "../model/types";
import { useNodeDrawing } from "./useNodeDrawing";

export interface C4ContextMenu {
  nodeId?: string;
  edgeId?: string;
  x: number;
  y: number;
}

export function useC4Editor({
  designDoc,
  designTab,
  onChangeDesignTab,
  history,
  dispatchModel,
  importing = false,
  importRevision = 0,
  readOnly = false,
}: C4ArchitectProps) {
  const { t } = useI18n();
  const { nodes, relationships } = history.present;
  const editGroup = useRef<symbol | undefined>(undefined);
  function beginEditGroup() {
    editGroup.current = Symbol();
  }
  function edit(apply: (graph: C4Graph) => C4Graph, group?: symbol) {
    if (readOnly) return;
    dispatchModel({ type: "edit", apply, group });
  }
  const [readmeMode, setReadmeMode] = useState<"reading" | "source">(
    designDoc || readOnly ? "reading" : "source",
  );
  const emptyView = {
    revision: importRevision,
    scopeId: "",
    selectedId: "",
    edgeId: "",
    contextMenu: null as C4ContextMenu | null,
  };
  const [view, setView] = useState(emptyView);
  const currentView = view.revision === importRevision ? view : emptyView;
  const { scopeId, selectedId, edgeId, contextMenu } = currentView;
  const updateView = (patch: Partial<Omit<typeof view, "revision">>) => {
    setView((previous) => ({
      ...(previous.revision === importRevision ? previous : emptyView),
      ...patch,
    }));
  };
  const setSelectedId = (next: string) => updateView({ selectedId: next });
  const setEdgeId = (next: string) => updateView({ edgeId: next });
  const setContextMenu = (next: C4ContextMenu | null) => updateView({ contextMenu: next });
  const flowInstance = useRef<ReactFlowInstance<CanvasNode> | null>(null);

  const { scope, path, visible, boundary } = c4Drilldown(nodes, scopeId);
  const showTechnology = path.length === 1 || path.length === 2;
  const expandableIds = new Set(nodes.map((node) => node.parentId).filter(Boolean));
  const selected = nodes.find((node) => node.id === selectedId);
  const selectedEdge = relationships.find((edge) => edge.id === edgeId);

  const addNode = (
    position: { x: number; y: number },
    size?: { width: number; height: number },
  ) => {
    if (readOnly) return;
    const node = createC4NodeInScope(
      nodes,
      scope?.id || "",
      crypto.randomUUID(),
      t("c4.newElement"),
      toModelPosition(position, scope),
    );
    if (!node) return;
    edit((graph) => {
      // Keep the visible frame in place when drawing a new node outside it.
      const existing =
        scope && !scope.boundary
          ? graph.nodes.map((item) => (item.id === scope.id ? { ...item, boundary } : item))
          : graph.nodes;
      return { ...graph, nodes: [...existing, { ...node, ...size }] };
    });
    onChangeDesignTab("diagram");
    updateView({ selectedId: "", edgeId: "", contextMenu: null });
  };

  const drawing = useNodeDrawing(flowInstance, addNode);

  const navigate = (id: string) => {
    drawing.cancelDrawing();
    if (id && !canExploreC4Node(nodes, id)) return;
    updateView({ scopeId: id, selectedId: "", edgeId: "", contextMenu: null });
  };
  function stepHistory(type: "undo" | "redo") {
    const target = (type === "undo" ? history.past : history.future).at(-1);
    if (!target || importing || readOnly) return;
    drawing.cancelDrawing();
    const patch: Partial<Omit<typeof view, "revision">> = {
      contextMenu: null,
    };
    if (scopeId && !canExploreC4Node(target.nodes, scopeId)) {
      patch.scopeId = path.findLast((node) => canExploreC4Node(target.nodes, node.id))?.id ?? "";
    }
    if (!target.nodes.some((node) => node.id === selectedId)) patch.selectedId = "";
    if (!target.relationships.some((edge) => edge.id === edgeId)) patch.edgeId = "";
    updateView(patch);
    dispatchModel({ type });
  }
  const update = (patch: Partial<Pick<C4Node, "label" | "technology" | "description">>) => {
    edit(
      (graph) => ({
        ...graph,
        nodes: graph.nodes.map((node) => (node.id === selectedId ? { ...node, ...patch } : node)),
      }),
      editGroup.current,
    );
  };
  const remove = (nodeIds: string[], edgeIds: string[] = []) => {
    if (readOnly) return;
    updateView({ selectedId: "", edgeId: "", contextMenu: null });
    edit((graph) => removeC4Elements(graph, nodeIds, edgeIds));
  };

  function select(id: string) {
    drawing.cancelDrawing();
    updateView({ selectedId: id, edgeId: "", contextMenu: null });
  }
  function selectEdge(id: string) {
    drawing.cancelDrawing();
    updateView({ edgeId: id, selectedId: "", contextMenu: null });
  }
  function updateLayout(changes: NodeChangeset<CanvasNode>) {
    if (readOnly) return;
    const resizing = changes.getByType("dimensions").some((change) => change.resizing);
    edit(
      (graph) => ({
        ...graph,
        nodes: applyCanvasLayout(graph.nodes, changes, scope, boundary),
      }),
      resizing ? editGroup.current : undefined,
    );
  }
  function updateEdge(patch: Partial<Pick<C4Relationship, "label" | "technology">>) {
    edit(
      (graph) => ({
        ...graph,
        relationships: graph.relationships.map((edge) =>
          edge.id === edgeId ? { ...edge, ...patch } : edge,
        ),
      }),
      editGroup.current,
    );
  }
  function canConnect({ source, target }: Pick<Connection, "source" | "target">) {
    if (readOnly) return false;
    return (
      source !== target &&
      !relationships.some((edge) => edge.source === source && edge.target === target)
    );
  }
  function connect({ source, target }: Connection) {
    if (readOnly) return;
    const edge = { id: crypto.randomUUID(), source, target, label: t("c4.uses"), technology: "" };
    edit((graph) => ({ ...graph, relationships: [...graph.relationships, edge] }));
    updateView({ selectedId: "", edgeId: "", contextMenu: null });
  }
  const { flowNodes, flowEdges } = buildFlowElements({
    visible,
    scope,
    boundary,
    relationships,
    selectedId,
    edgeId,
    expandableIds,
    showTechnology,
  });
  return {
    readOnly,
    selectedSourceLabel:
      selectedEdge && nodes.find((node) => node.id === selectedEdge.source)?.label,
    selectedTargetLabel:
      selectedEdge && nodes.find((node) => node.id === selectedEdge.target)?.label,
    updateEdge,
    beginEditGroup,
    canUndo: !readOnly && !importing && history.past.length > 0,
    canRedo: !readOnly && !importing && history.future.length > 0,
    stepHistory,
    canConnect,
    connect,
    updateLayout,
    select,
    selectEdge,
    t,
    designTab,
    readmeMode,
    setReadmeMode,
    setSelectedId,
    setEdgeId,
    contextMenu,
    setContextMenu,
    drawing,
    flowInstance,
    importRevision,
    scope,
    path,
    visible,
    showTechnology,
    selected,
    selectedEdge,
    flowNodes,
    flowEdges,
    navigate,
    update,
    remove,
  };
}

export type C4Editor = ReturnType<typeof useC4Editor>;
