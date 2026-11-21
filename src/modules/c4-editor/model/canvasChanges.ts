import { overlapsC4Boundary } from "@modules/c4-model";
import { NodeChangeset } from "@xyflow/react";

import { BOUNDARY_ID } from "./canvasLayout";
import type { CanvasNode } from "./flowTypes";

function canvasBounds(node: CanvasNode) {
  return {
    ...node.position,
    width: Number(node.width ?? node.style?.width),
    height: Number(node.height ?? node.style?.height),
  };
}

export function classifyCanvasNodes(nodes: CanvasNode[]): CanvasNode[] {
  const frame = nodes.find((node) => node.type === "boundary");
  if (!frame) return nodes;
  const boundary = canvasBounds(frame);
  return nodes.map((node) => {
    if (node.type !== "c4") return node;
    const external = !overlapsC4Boundary(canvasBounds(node), boundary);
    return external === !!node.data.external ? node : { ...node, data: { ...node.data, external } };
  });
}

/** Move overlapping nodes with the boundary and only persist user edits. */
export function prepareC4CanvasChanges(
  incoming: NodeChangeset<CanvasNode>,
  nodes: CanvasNode[],
  movingIds: string[] | null,
) {
  const changes = new NodeChangeset<CanvasNode>(incoming.toArray());
  const boundaryMove = changes
    .getByType("position")
    .find((change) => change.id === BOUNDARY_ID && change.position);
  const frameResized = changes
    .getByType("dimensions")
    .some((change) => change.id === BOUNDARY_ID && change.setAttributes);
  if (boundaryMove?.position && !frameResized) {
    const frame = nodes.find((node) => node.id === boundaryMove.id);
    if (frame) {
      const boundary = canvasBounds(frame);
      movingIds ??= nodes
        .filter(
          (node) => node.type !== "boundary" && overlapsC4Boundary(canvasBounds(node), boundary),
        )
        .map((node) => node.id);
      const dx = boundaryMove.position.x - frame.position.x;
      const dy = boundaryMove.position.y - frame.position.y;
      const movingNodeIds = new Set(movingIds);
      changes.add(
        nodes
          .filter((node) => movingNodeIds.has(node.id))
          .map((node) => ({
            id: node.id,
            type: "position" as const,
            dragging: boundaryMove.dragging,
            position: {
              x: node.position.x + dx,
              y: node.position.y + dy,
            },
          })),
      );
      if (boundaryMove.dragging !== true) movingIds = null;
    }
  }
  const completedMoves = new NodeChangeset<CanvasNode>(
    changes
      .toArray()
      .filter(
        (change) =>
          (change.type === "position" && change.position && change.dragging !== true) ||
          (change.type === "dimensions" && change.dimensions && change.setAttributes),
      ),
  );
  return { changes, completedMoves, movingIds };
}
