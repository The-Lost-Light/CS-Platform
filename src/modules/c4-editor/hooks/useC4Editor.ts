import {
  c4Drilldown,
  canExploreC4Node,
  createC4NodeInScope,
  type C4Node,
  type C4Relationship,
  C4_FILE_MAX_BYTES,
  parseC4File,
} from "@modules/c4-model";
import { useI18n } from "@modules/i18n";
import { type Connection, type NodeChangeset, type ReactFlowInstance } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

import { applyCanvasLayout, SCOPE_OFFSET } from "../model/canvasLayout";
import { buildFlowElements } from "../model/flowElements";
import type { CanvasNode } from "../model/flowTypes";
import { removeC4Elements, type C4Graph } from "../model/modelHistory";
import type { C4ArchitectProps } from "../model/types";
import { downloadC4Model } from "../services/c4Download";
import { useNodeDrawing } from "./useNodeDrawing";

type FileStatus = "importSuccess" | "importError" | "fileTooLarge" | "exportError";

const FILE_STATUS_DURATION_MS: Record<FileStatus, number> = {
  importSuccess: 3500,
  importError: 6000,
  fileTooLarge: 5000,
  exportError: 5000,
};

export function useC4Editor({
  designDoc,
  designTab,
  onChangeDesignTab,
  history,
  dispatchModel,
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
  const [scopeId, setScopeId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [edgeId, setEdgeId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const flowInstance = useRef<ReactFlowInstance<CanvasNode> | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileNotice, setFileNotice] = useState<{ status: FileStatus; id: number } | null>(null);
  const fileStatus = fileNotice?.status ?? null;
  const setFileStatus = (status: FileStatus | null) => {
    setFileNotice((previous) => (status ? { status, id: (previous?.id ?? 0) + 1 } : null));
  };
  useEffect(() => {
    if (!fileNotice) return;
    const timer = setTimeout(() => {
      setFileNotice((current) => (current?.id === fileNotice.id ? null : current));
    }, FILE_STATUS_DURATION_MS[fileNotice.status]);
    return () => clearTimeout(timer);
  }, [fileNotice]);
  const [importRevision, setImportRevision] = useState(0);
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

  const exportModel = () => {
    try {
      downloadC4Model(nodes, relationships);
      setFileStatus(null);
    } catch {
      setFileStatus("exportError");
    }
  };

  const importModel = async (file: File) => {
    setFileStatus(null);
    if (file.size > C4_FILE_MAX_BYTES) {
      setFileStatus("fileTooLarge");
      return;
    }
    setImporting(true);
    try {
      const model = parseC4File(await file.text());
      edit(() => model);
      setScopeId("");
      setSelectedId("");
      setEdgeId("");
      setImportRevision((value) => value + 1);
      onChangeDesignTab("diagram");
      setFileStatus("importSuccess");
    } catch {
      setFileStatus("importError");
    } finally {
      setImporting(false);
    }
  };

  const { scope, path, inside, visible } = c4Drilldown(nodes, scopeId);
  const expandableIds = new Set(nodes.map((node) => node.parentId).filter(Boolean));
  const selected = nodes.find((node) => node.id === selectedId);
  const selectedEdge = relationships.find((edge) => edge.id === edgeId);

  const boundary = scope?.boundary ?? {
    x: -40,
    y: -70,
    width: Math.max(600, ...inside.map((node) => node.x + (node.width ?? 280) + 80)),
    height: Math.max(360, ...inside.map((node) => node.y + (node.height ?? 230) + 110)),
  };
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
  const update = (patch: Partial<C4Node>) => {
    if (patch.external && expandableIds.has(selectedId)) return;
    edit(
      (graph) => ({
        ...graph,
        nodes: graph.nodes.map((node) => (node.id === selectedId ? { ...node, ...patch } : node)),
      }),
      patch.external === undefined ? editGroup.current : undefined,
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
    edit((graph) => ({ ...graph, nodes: [...graph.nodes, { ...node, ...size }] }));
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
    t,
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
    fileInput,
    flowInstance,
    importing,
    fileStatus,
    importRevision,
    cancelNodeClick,
    exportModel,
    importModel,
    scope,
    path,
    inside,
    expandableIds,
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
