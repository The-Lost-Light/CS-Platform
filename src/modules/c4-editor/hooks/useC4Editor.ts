import {
  c4Drilldown,
  canExploreC4Node,
  createC4NodeInScope,
  SCOPE_OFFSET,
  type C4Node,
  type C4Relationship,
} from "@modules/c4-model";
import { useI18n } from "@modules/i18n";
import { type Connection, type NodeChangeset, type ReactFlowInstance } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

import { applyCanvasLayout } from "../model/canvasLayout";
import { buildFlowElements } from "../model/flowElements";
import type { CanvasNode } from "../model/flowTypes";
import { removeC4Elements, type C4Graph } from "../model/modelHistory";
import type { C4ArchitectProps } from "../model/types";
import { useNodeDrawing } from "./useNodeDrawing";

export function useC4Editor({
  designDoc,
  designTab,
  onChangeDesignTab,
  history,
  dispatchModel,
  importing = false,
  importRevision = 0,
}: C4ArchitectProps) {
  const { t } = useI18n();
  const { nodes, relationships } = history.present;
  const editGroup = useRef<symbol | undefined>(undefined);
  function beginEditGroup() {
    editGroup.current = Symbol();
  }
  function edit(apply: (graph: C4Graph) => C4Graph, group?: symbol) {
    dispatchModel({ type: "edit", apply, group });
  }
  const [readmeMode, setReadmeMode] = useState<"reading" | "source">(
    designDoc ? "reading" : "source",
  );
  const [view, setView] = useState({
    revision: importRevision,
    scopeId: "",
    selectedId: "",
    edgeId: "",
  });
  const currentView =
    view.revision === importRevision
      ? view
      : { revision: importRevision, scopeId: "", selectedId: "", edgeId: "" };
  const { scopeId, selectedId, edgeId } = currentView;
  const updateView = (patch: Partial<Pick<typeof view, "scopeId" | "selectedId" | "edgeId">>) => {
    setView((previous) => ({
      ...(previous.revision === importRevision
        ? previous
        : { revision: importRevision, scopeId: "", selectedId: "", edgeId: "" }),
      ...patch,
    }));
  };
  const setScopeId = (next: string) => updateView({ scopeId: next });
  const setSelectedId = (next: string) => updateView({ selectedId: next });
  const setEdgeId = (next: string) => updateView({ edgeId: next });
  const flowInstance = useRef<ReactFlowInstance<CanvasNode> | null>(null);
  const nodeClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelNodeClick = () => {
    if (nodeClickTimer.current !== null) {
      clearTimeout(nodeClickTimer.current);
      nodeClickTimer.current = null;
    }
  };
  useEffect(() => {
    // Discard pending selections when leaving or replacing the canvas.
    return () => cancelNodeClick();
  }, [designTab, scopeId, importRevision]);

  const { scope, path, visible, boundary } = c4Drilldown(nodes, scopeId);
  const showTechnology = path.length === 1 || path.length === 2;
  const expandableIds = new Set(nodes.map((node) => node.parentId).filter(Boolean));
  const selected = nodes.find((node) => node.id === selectedId);
  const selectedEdge = relationships.find((edge) => edge.id === edgeId);

  const navigate = (id: string) => {
    cancelNodeClick();
    if (id && !canExploreC4Node(nodes, id)) return;
    setScopeId(id);
    setSelectedId("");
    setEdgeId("");
  };
  function stepHistory(type: "undo" | "redo") {
    const target = (type === "undo" ? history.past : history.future).at(-1);
    if (!target || importing) return;
    cancelNodeClick();
    if (scopeId && !canExploreC4Node(target.nodes, scopeId)) {
      setScopeId(path.findLast((node) => canExploreC4Node(target.nodes, node.id))?.id ?? "");
    }
    if (!target.nodes.some((node) => node.id === selectedId)) setSelectedId("");
    if (!target.relationships.some((edge) => edge.id === edgeId)) setEdgeId("");
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
    cancelNodeClick();
    setSelectedId("");
    setEdgeId("");
    edit((graph) => removeC4Elements(graph, nodeIds, edgeIds));
  };
  const addNode = (
    position: { x: number; y: number },
    size?: { width: number; height: number },
  ) => {
    cancelNodeClick();
    const node = createC4NodeInScope(
      nodes,
      scope?.id || "",
      crypto.randomUUID(),
      t("c4.newElement"),
      {
        x: position.x - (scope ? SCOPE_OFFSET.x : 0),
        y: position.y - (scope ? SCOPE_OFFSET.y : 0),
      },
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
    setSelectedId(node.id);
    setEdgeId("");
  };

  function select(id: string) {
    cancelNodeClick();
    setSelectedId(id);
    setEdgeId("");
  }
  function selectAfterClick(detail: number, id: string) {
    cancelNodeClick();
    if (detail > 1) return;
    nodeClickTimer.current = setTimeout(() => {
      nodeClickTimer.current = null;
      setSelectedId(id);
      setEdgeId("");
    }, 350);
  }
  function updateLayout(changes: NodeChangeset<CanvasNode>) {
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
    return (
      source !== target &&
      !relationships.some((edge) => edge.source === source && edge.target === target)
    );
  }
  function connect({ source, target }: Connection) {
    const edge = { id: crypto.randomUUID(), source, target, label: t("c4.uses"), technology: "" };
    edit((graph) => ({ ...graph, relationships: [...graph.relationships, edge] }));
    setEdgeId(edge.id);
    setSelectedId("");
  }
  const drawing = useNodeDrawing(flowInstance, addNode);
  const { flowNodes, flowEdges } = buildFlowElements({
    visible,
    scope,
    boundary,
    relationships,
    selectedId,
    edgeId,
    expandableIds,
    showTechnology,
    select,
    explore: navigate,
  });
  return {
    selectedSourceLabel:
      selectedEdge && nodes.find((node) => node.id === selectedEdge.source)?.label,
    selectedTargetLabel:
      selectedEdge && nodes.find((node) => node.id === selectedEdge.target)?.label,
    updateEdge,
    beginEditGroup,
    canUndo: !importing && history.past.length > 0,
    canRedo: !importing && history.future.length > 0,
    stepHistory,
    canConnect,
    connect,
    updateLayout,
    selectAfterClick,
    t,
    designTab,
    readmeMode,
    setReadmeMode,
    setSelectedId,
    setEdgeId,
    drawing,
    flowInstance,
    importRevision,
    cancelNodeClick,
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
