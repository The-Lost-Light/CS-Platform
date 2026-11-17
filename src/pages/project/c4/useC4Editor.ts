import { downloadC4Model } from "@services/c4Download";
import { useEffect, useRef, useState } from "react";
import { MarkerType, type ReactFlowInstance } from "@xyflow/react";
import { useI18n } from "@i18n";
import { C4_FILE_MAX_BYTES, parseC4File } from "@domain/c4File";
import {
  c4Drilldown,
  canExploreC4Node,
  createC4NodeInScope,
  removeC4Nodes,
  type C4Node,
} from "@domain/c4";
import type { CanvasNode } from "@pages/project/c4/flowTypes";
import type { C4ArchitectProps } from "@pages/project/c4/types";

export function useC4Editor({
  nodes,
  onChangeNodes,
  relationships,
  onChangeRelationships,
}: C4ArchitectProps) {
  const { t } = useI18n();
  const [designTab, setDesignTab] = useState<"readme" | "diagram">("readme");
  const [readmeMode, setReadmeMode] = useState<"reading" | "source">("reading");
  const [scopeId, setScopeId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [edgeId, setEdgeId] = useState("");
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
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
  const expandableIds = new Set(
    nodes.map((node) => node.parentId).filter(Boolean),
  );
  const visibleIds = new Set(visible.map((node) => node.id));
  const selected = nodes.find((node) => node.id === selectedId);
  const selectedEdge = relationships.find((edge) => edge.id === edgeId);

  const boundaryId = "__c4_boundary__";
  const boundary = scope?.boundary ?? {
    x: -40,
    y: -70,
    width: Math.max(
      600,
      ...inside.map((node) => node.x + (node.width ?? 280) + 80),
    ),
    height: Math.max(
      360,
      ...inside.map((node) => node.y + (node.height ?? 230) + 110),
    ),
  };
  const insideIds = new Set(inside.map((node) => node.id));
  const flowNodes: CanvasNode[] = visible.map((node) => ({
    id: node.id,
    type: "c4",
    position: { x: node.x + (scope ? 40 : 0), y: node.y + (scope ? 70 : 0) },
    zIndex: 1,
    selected: node.id === selectedId,
    style: { width: node.width ?? 280, height: node.height ?? 230 },
    data: {
      title: node.label,
      external: !!node.external,
      boundaryLabel: t(node.external ? "c4.external" : "c4.internal"),
      kind: node.kind,
      description: node.description,
      technology: node.technology,
      status: node.expectedPath,
      expandable: expandableIds.has(node.id),
      onSelect: () => {
        cancelNodeClick();
        setSelectedId(node.id);
        setEdgeId("");
      },
      onExplore: () => navigate(node.id),
    },
  }));

  if (scope)
    flowNodes.unshift({
      id: boundaryId,
      type: "boundary",
      position: { x: boundary.x, y: boundary.y },
      style: { width: boundary.width, height: boundary.height },
      data: { title: scope.label },
      selected: selectedId === boundaryId,
      deletable: false,
      connectable: false,
      dragHandle: ".c4-boundary-drag",
      zIndex: -1,
    });

  const flowEdges = relationships
    .filter(
      (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
    )
    .map((edge) => ({
      ...edge,
      type: "smoothstep",
      label: edge.label,
      selected: edge.id === edgeId,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "var(--c4-edge)",
      },
      style: {
        strokeWidth: 2,
        stroke:
          edge.id === edgeId ? "var(--c4-edge-selected)" : "var(--c4-edge)",
      },
      labelStyle: { fontSize: 11, fontWeight: 600, fill: "var(--on-surface)" },
      labelBgStyle: { fill: "var(--c4-edge-label-bg)", fillOpacity: 0.95 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 8,
    }));

  const navigate = (id: string) => {
    cancelNodeClick();
    if (id && !canExploreC4Node(nodes, id)) return;
    setScopeId(id);
    setSelectedId("");
    setEdgeId("");
  };
  const update = (patch: Partial<C4Node>) => {
    if (patch.external && expandableIds.has(selectedId)) return;
    onChangeNodes(
      nodes.map((node) =>
        node.id === selectedId ? { ...node, ...patch } : node,
      ),
    );
  };
  const remove = (ids: string[]) => {
    const remaining = removeC4Nodes(nodes, ids);
    setSelectedId("");
    setEdgeId("");
    const remainingIds = new Set(remaining.map((node) => node.id));
    onChangeNodes(remaining);
    onChangeRelationships(
      relationships.filter(
        (edge) =>
          remainingIds.has(edge.source) && remainingIds.has(edge.target),
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
      { x: position.x - (scope ? 40 : 0), y: position.y - (scope ? 70 : 0) },
    );
    if (!node) return;
    onChangeNodes([...nodes, { ...node, ...size }]);
    setDesignTab("diagram");
    setSelectedId(node.id);
    setEdgeId("");
  };

  return {
    t,
    designTab,
    setDesignTab,
    readmeMode,
    setReadmeMode,
    scopeId,
    selectedId,
    setSelectedId,
    edgeId,
    setEdgeId,
    drawStart,
    drawPreview,
    setDrawPreview,
    fileInput,
    flowInstance,
    importing,
    fileStatus,
    importRevision,
    nodeClickTimer,
    cancelNodeClick,
    exportModel,
    importModel,
    scope,
    path,
    inside,
    expandableIds,
    selected,
    selectedEdge,
    boundaryId,
    boundary,
    insideIds,
    flowNodes,
    flowEdges,
    navigate,
    update,
    remove,
    addNode,
  };
}
