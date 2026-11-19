import type { C4Node, C4Relationship } from "@modules/c4-model";
import type { Translator } from "@modules/i18n";
import { MarkerType } from "@xyflow/react";

import { BOUNDARY_ID, SCOPE_OFFSET } from "./canvasLayout";
import type { CanvasNode } from "./flowTypes";

interface FlowView {
  visible: C4Node[];
  scope?: C4Node;
  boundary: NonNullable<C4Node["boundary"]>;
  relationships: C4Relationship[];
  selectedId: string;
  edgeId: string;
  expandableIds: Set<string | null>;
  t: Translator;
  select: (id: string) => void;
  explore: (id: string) => void;
}
export function buildFlowElements({
  visible,
  scope,
  boundary,
  relationships,
  selectedId,
  edgeId,
  expandableIds,
  t,
  select,
  explore,
}: FlowView) {
  const visibleIds = new Set(visible.map((node) => node.id));
  const flowNodes: CanvasNode[] = visible.map((node) => ({
    id: node.id,
    type: "c4",
    position: {
      x: node.x + (scope ? SCOPE_OFFSET.x : 0),
      y: node.y + (scope ? SCOPE_OFFSET.y : 0),
    },
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
      onSelect: () => select(node.id),
      onExplore: () => explore(node.id),
    },
  }));

  if (scope)
    flowNodes.unshift({
      id: BOUNDARY_ID,
      type: "boundary",
      position: { x: boundary.x, y: boundary.y },
      style: { width: boundary.width, height: boundary.height },
      data: { title: scope.label },
      selected: selectedId === BOUNDARY_ID,
      deletable: false,
      connectable: false,
      dragHandle: ".c4-boundary-drag",
      zIndex: -1,
    });

  const flowEdges = relationships
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
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
        stroke: edge.id === edgeId ? "var(--c4-edge-selected)" : "var(--c4-edge)",
      },
      labelStyle: { fontSize: 11, fontWeight: 600, fill: "var(--on-surface)" },
      labelBgStyle: { fill: "var(--c4-edge-label-bg)", fillOpacity: 0.95 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 8,
    }));

  return { flowNodes, flowEdges };
}
