import { BOUNDARY_ID, c4NodeBounds, type C4Node, type C4Relationship } from "@modules/c4-model";
import { MarkerType } from "@xyflow/react";

import type { CanvasNode } from "./flowTypes";

interface FlowView {
  visible: C4Node[];
  scope?: C4Node;
  boundary: NonNullable<C4Node["boundary"]>;
  relationships: C4Relationship[];
  selectedId: string;
  edgeId: string;
  expandableIds: Set<string | null>;
  showTechnology: boolean;
}
export function buildFlowElements({
  visible,
  scope,
  boundary,
  relationships,
  selectedId,
  edgeId,
  expandableIds,
  showTechnology,
}: FlowView) {
  const visibleIds = new Set(visible.map((node) => node.id));
  const flowNodes: CanvasNode[] = visible.map((node) => {
    const { x, y, width, height } = c4NodeBounds(node);
    return {
      id: node.id,
      type: "c4",
      position: { x, y },
      zIndex: 1,
      selectable: false,
      selected: node.id === selectedId,
      style: { width, height },
      data: {
        title: node.label,
        description: node.description,
        technology: showTechnology ? node.technology : "",
        expandable: expandableIds.has(node.id),
      },
    };
  });

  if (scope)
    flowNodes.unshift({
      id: BOUNDARY_ID,
      type: "boundary",
      position: { x: boundary.x, y: boundary.y },
      style: { width: boundary.width, height: boundary.height },
      data: { title: scope.label },
      selectable: false,
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
      selectable: false,
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
