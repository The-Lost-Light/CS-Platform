import type { C4Node } from "@modules/c4-model";
import type { NodeChangeset } from "@xyflow/react";
import type { CanvasNode } from "./flowTypes";

export const BOUNDARY_ID = "__c4_boundary__";
export const SCOPE_OFFSET = { x: 40, y: 70 };

export function applyCanvasLayout(
  nodes: C4Node[],
  changes: NodeChangeset<CanvasNode>,
  scope: C4Node | undefined,
  boundary: NonNullable<C4Node["boundary"]>,
) {
  const frame = { ...boundary };
  const patches = new Map<string, Partial<Pick<C4Node, "x" | "y" | "width" | "height">>>();
  for (const change of changes) {
    if (change.type !== "position" && change.type !== "dimensions") continue;
    const geometry = change.type === "position" ? change.position : change.dimensions;
    if (!geometry) continue;
    if (change.id === BOUNDARY_ID) {
      Object.assign(frame, geometry);
      continue;
    }
    const patch = patches.get(change.id) ?? {};
    if (change.type === "position" && change.position) {
      patch.x = change.position.x - (scope ? SCOPE_OFFSET.x : 0);
      patch.y = change.position.y - (scope ? SCOPE_OFFSET.y : 0);
    } else if (change.type === "dimensions" && change.dimensions) {
      patch.width = change.dimensions.width;
      patch.height = change.dimensions.height;
    }
    patches.set(change.id, patch);
  }
  return nodes.map((node) => {
    if (scope && node.id === scope.id) return { ...node, boundary: frame };
    if (scope && node.parentId !== scope.id) return node;
    const patch = patches.get(node.id);
    return patch ? { ...node, ...patch } : node;
  });
}
