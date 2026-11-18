import { BOUNDARY_ID } from "./canvasLayout";
import { overlapsC4Boundary } from "@modules/c4-model";
import type { CanvasNode } from "./flowTypes";
import { NodeChangeset } from "@xyflow/react";

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
  if (boundaryMove?.position) {
    const frame = nodes.find((node) => node.id === boundaryMove.id);
    if (frame) {
      const width = Number(frame.style?.width ?? 600);
      const height = Number(frame.style?.height ?? 360);
      movingIds ??= nodes
        .filter(
          (node) =>
            node.type !== "boundary" &&
            overlapsC4Boundary(
              {
                ...node.position,
                width: Number(node.style?.width ?? 280),
                height: Number(node.style?.height ?? 230),
              },
              { ...frame.position, width, height },
            ),
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
