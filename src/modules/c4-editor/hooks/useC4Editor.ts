import { useNodeDrawing } from "./useNodeDrawing";
import { applyCanvasLayout, SCOPE_OFFSET } from "../model/canvasLayout";
import { buildFlowElements } from "../model/flowElements";
import {
  c4Drilldown,
  canExploreC4Node,
  createC4NodeInScope,
  removeC4Nodes,
  type C4Node,
  type C4Relationship,
  C4_FILE_MAX_BYTES,
  parseC4File,
} from "@modules/c4-model";
import { useI18n } from "@modules/i18n";
import type { CanvasNode } from "../model/flowTypes";
import type { C4ArchitectProps } from "../model/types";
import { downloadC4Model } from "../services/c4Download";
import { type Connection, type NodeChangeset, type ReactFlowInstance } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

export function useC4Editor({
  designDoc,
  nodes,
  onChangeNodes,
  relationships,
  onChangeRelationships,
}: C4ArchitectProps) {
  const { t } = useI18n();
  const [designTab, setDesignTab] = useState<"readme" | "diagram">("readme");
  const [readmeMode, setReadmeMode] = useState<"reading" | "source">(
    designDoc ? "reading" : "source",
  );
  const [scopeId, setScopeId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [edgeId, setEdgeId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const flowInstance = useRef<ReactFlowInstance<CanvasNode> | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileStatus, setFileStatus] = useState<
    "importSuccess" | "importError" | "fileTooLarge" | "exportError" | null
  >(null);
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
      onChangeNodes(model.nodes);
      onChangeRelationships(model.relationships);
      setScopeId("");
      setSelectedId("");
      setEdgeId("");
      setImportRevision((value) => value + 1);
      setDesignTab("diagram");
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
  const update = (patch: Partial<C4Node>) => {
    if (patch.external && expandableIds.has(selectedId)) return;
    onChangeNodes(nodes.map((node) => (node.id === selectedId ? { ...node, ...patch } : node)));
  };
  const remove = (ids: string[]) => {
    const remaining = removeC4Nodes(nodes, ids);
    setSelectedId("");
    setEdgeId("");
    const remainingIds = new Set(remaining.map((node) => node.id));
    onChangeNodes(remaining);
    onChangeRelationships(
      relationships.filter(
        (edge) => remainingIds.has(edge.source) && remainingIds.has(edge.target),
      ),
    );
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
    onChangeNodes([...nodes, { ...node, ...size }]);
    setDesignTab("diagram");
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
    onChangeNodes(applyCanvasLayout(nodes, changes, scope, boundary));
  }
  function removeEdges(ids: string[]) {
    const removed = new Set(ids);
    onChangeRelationships(relationships.filter((edge) => !removed.has(edge.id)));
  }
  function updateEdge(patch: Partial<Pick<C4Relationship, "label" | "technology">>) {
    onChangeRelationships(
      relationships.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
    );
  }
  function canConnect({ source, target }: Pick<Connection, "source" | "target">) {
    return (
      source !== target &&
      !relationships.some((edge) => edge.source === source && edge.target === target)
    );
  }
  function connect({ source, target }: Connection) {
    const id = crypto.randomUUID();
    onChangeRelationships([
      ...relationships,
      { id, source, target, label: t("c4.uses"), technology: "" },
    ]);
    setEdgeId(id);
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
    removeEdges,
    canConnect,
    connect,
    updateLayout,
    selectAfterClick,
    t,
    designTab,
    setDesignTab,
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
