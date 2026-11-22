import { BOUNDARY_ID, SCOPE_OFFSET, type C4Node } from "@modules/c4-model";
import type { NodeChangeset } from "@xyflow/react";

import type { CanvasNode } from "./flowTypes";

export function toModelPosition(position: { x: number; y: number }, scope: C4Node | undefined) {
  return {
    x: position.x - (scope ? SCOPE_OFFSET.x : 0),
    y: position.y - (scope ? SCOPE_OFFSET.y : 0),
  };
}

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
      Object.assign(patch, toModelPosition(change.position, scope));
    } else if (change.type === "dimensions" && change.dimensions) {
      patch.width = change.dimensions.width;
      patch.height = change.dimensions.height;
    }
    patches.set(change.id, patch);
  }
  const updated = nodes.map((node) => {
    if (scope && node.parentId !== scope.id) return node;
    const patch = patches.get(node.id);
    if (!patch) return node;
    const changed = (Object.keys(patch) as (keyof typeof patch)[]).some(
      (key) => patch[key] !== node[key],
    );
    return changed ? { ...node, ...patch } : node;
  });
  const moved = updated.some((node, index) => node !== nodes[index]);
  const frameChanged =
    frame.x !== boundary.x ||
    frame.y !== boundary.y ||
    frame.width !== boundary.width ||
    frame.height !== boundary.height;
  if (scope && (frameChanged || (moved && !scope.boundary))) {
    return updated.map((node) => (node.id === scope.id ? { ...node, boundary: frame } : node));
  }
  return moved ? updated : nodes;
}
