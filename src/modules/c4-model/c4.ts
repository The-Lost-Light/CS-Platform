export const C4_KINDS = ["person", "system", "container", "component", "code"] as const;
export type C4Kind = (typeof C4_KINDS)[number];
export interface C4Node {
  id: string;
  label: string;
  kind: C4Kind;
  category: string;
  description: string;
  technology: string;
  parentId: string | null;
  x: number;
  y: number;
  width?: number;
  height?: number;
  boundary?: { x: number; y: number; width: number; height: number };
}
export interface C4Relationship {
  id: string;
  source: string;
  target: string;
  label: string;
  technology: string;
}
export const C4_MAX_LEVELS = 4;
export const BOUNDARY_ID = "__c4_boundary__";
const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 230;

export const SCOPE_OFFSET = { x: 40, y: 70 };

export function c4NodeBounds(node: C4Node) {
  return {
    x: node.x + (node.parentId ? SCOPE_OFFSET.x : 0),
    y: node.y + (node.parentId ? SCOPE_OFFSET.y : 0),
    width: node.width ?? DEFAULT_NODE_WIDTH,
    height: node.height ?? DEFAULT_NODE_HEIGHT,
  };
}

function defaultBoundary(children: C4Node[]) {
  return {
    x: -40,
    y: -70,
    width: Math.max(
      600,
      ...children.map((node) => node.x + (node.width ?? DEFAULT_NODE_WIDTH) + 80),
    ),
    height: Math.max(
      360,
      ...children.map((node) => node.y + (node.height ?? DEFAULT_NODE_HEIGHT) + 110),
    ),
  };
}

export function canExploreC4Node(nodes: C4Node[], id: string): boolean {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let current = byId.get(id);
  for (let depth = 1; current && depth < C4_MAX_LEVELS; depth++) {
    if (current.kind === "code") return false;
    if (current.parentId === null) return true;
    current = byId.get(current.parentId);
  }
  return false;
}

export function createC4NodeInScope(
  nodes: C4Node[],
  scopeId: string,
  id: string,
  label: string,
  position?: { x: number; y: number },
): C4Node | undefined {
  const scope = nodes.find((node) => node.id === scopeId);
  if (scopeId && !canExploreC4Node(nodes, scopeId)) return undefined;
  const children: Record<C4Kind, C4Kind> = {
    person: "component",
    system: "container",
    container: "component",
    component: "code",
    code: "code",
  };
  const kind = scope ? children[scope.kind] : "system";
  if (!kind) return undefined;
  const parentId = scope?.id ?? null;
  const siblings = nodes.filter((node) => (node.parentId || null) === parentId);
  // Place below existing siblings, including manually moved nodes, without overlapping them.
  return {
    id,
    label,
    kind,
    category: kind,
    parentId,
    description: "",
    technology: "",
    x: position?.x ?? 0,
    y:
      position?.y ??
      (siblings.length
        ? Math.max(...siblings.map((node) => node.y + (node.height ?? DEFAULT_NODE_HEIGHT))) + 50
        : 0),
  };
}

/** Show only elements created at the current level. */
export function c4Drilldown(nodes: C4Node[], scopeId: string) {
  const path: C4Node[] = [];
  const seen = new Set<string>();
  let current = nodes.find((node) => node.id === scopeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = nodes.find((node) => node.id === current?.parentId);
  }
  path.splice(C4_MAX_LEVELS - 1);
  const scope = path.at(-1);
  const visible = nodes.filter((node) => (scope ? node.parentId === scope.id : !node.parentId));
  const boundary = scope?.boundary ?? defaultBoundary(visible);
  return { path, scope, boundary, visible };
}

export function removeC4Nodes(nodes: C4Node[], ids: string[]) {
  const removed = new Set(ids);
  let size = -1;
  while (size !== removed.size) {
    size = removed.size;
    nodes.forEach((node) => {
      if (node.parentId && removed.has(node.parentId)) removed.add(node.id);
    });
  }
  return nodes.filter((node) => !removed.has(node.id));
}

/** Partial overlaps count; touching edges alone do not. Used to move nodes together with the boundary. */
export function overlapsC4Boundary(
  node: { x: number; y: number; width: number; height: number },
  boundary: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    node.x < boundary.x + boundary.width &&
    node.x + node.width > boundary.x &&
    node.y < boundary.y + boundary.height &&
    node.y + node.height > boundary.y
  );
}
