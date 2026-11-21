interface MindMapNode {
  id: string;
  label: string;
  category: string;
  expectedPath: string;
  description: string;
  parentId: string | null;
  x: number;
  y: number;
}

export type C4Kind = "person" | "system" | "container" | "component" | "code";
export type C4Node = Omit<MindMapNode, "expectedPath"> & {
  kind: C4Kind;
  technology: string;
  width?: number;
  height?: number;
  boundary?: { x: number; y: number; width: number; height: number };
};
export interface C4Relationship {
  id: string;
  source: string;
  target: string;
  label: string;
  technology: string;
}
export const parentKind: Partial<Record<C4Kind, C4Kind>> = {
  container: "system",
  component: "container",
  code: "component",
};
export const C4_MAX_LEVELS = 4;

export const SCOPE_OFFSET = { x: 40, y: 70 };

export function c4NodeBounds(node: C4Node) {
  return {
    x: node.x + (node.parentId ? SCOPE_OFFSET.x : 0),
    y: node.y + (node.parentId ? SCOPE_OFFSET.y : 0),
    width: node.width ?? 280,
    height: node.height ?? 230,
  };
}

function defaultBoundary(children: C4Node[]) {
  return {
    x: -40,
    y: -70,
    width: Math.max(600, ...children.map((node) => node.x + (node.width ?? 280) + 80)),
    height: Math.max(360, ...children.map((node) => node.y + (node.height ?? 230) + 110)),
  };
}

export function canExploreC4Node(nodes: C4Node[], id: string): boolean {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let current = byId.get(id);
  for (let depth = 1; current && depth < C4_MAX_LEVELS; depth++) {
    if (current.kind === "code") return false;
    const parentId = current.parentId;
    if (parentId === null) return true;
    const parent = byId.get(parentId);
    if (!parent) return false;
    const frame =
      parent.boundary ?? defaultBoundary(nodes.filter((node) => node.parentId === parentId));
    if (!overlapsC4Boundary(c4NodeBounds(current), frame)) return false;
    current = parent;
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
        ? Math.max(...siblings.map((node) => node.y + (node.height ?? 230))) + 50
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
  const inside: C4Node[] = [];
  const outside: C4Node[] = [];
  for (const node of visible) {
    if (scope && !overlapsC4Boundary(c4NodeBounds(node), boundary)) outside.push(node);
    else inside.push(node);
  }
  return { path, scope, boundary, inside, outside, visible };
}

/** Infer C4 containment from legacy mind-map categories and paths. */
export function migrateC4Nodes(nodes: MindMapNode[]): C4Node[] {
  const root = nodes.find((node) => !node.parentId);
  const migrated = nodes.map((node, index) => {
    const kind: C4Kind =
      node === root
        ? "system"
        : node.parentId === root?.id || node.category === "database"
          ? "container"
          : "component";
    return {
      ...node,
      kind,
      technology: "",
      parentId: kind === "container" ? (root?.id ?? null) : node.parentId,
      x: (index % 3) * 310,
      y: Math.floor(index / 3) * 240,
    };
  });
  // Tests and documentation describe implementation; they are not deployable containers.
  const container = migrated.find(
    (node) => node.kind === "container" && !["testing", "database"].includes(node.category),
  );
  if (container)
    migrated.forEach((node) => {
      if (node.category === "testing" || node.expectedPath.startsWith("docs/")) {
        node.kind = "component";
        node.parentId =
          migrated.find((parent) => parent.id === node.parentId && parent.kind === "container")
            ?.id || container.id;
      }
    });
  return migrated.map(({ expectedPath: _path, ...node }) => node);
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

export function visibleC4Nodes(nodes: C4Node[], level: C4Kind, scope: string): C4Node[] {
  if (level === "system")
    return nodes.filter((node) => node.kind === "person" || node.kind === "system");
  const view = c4Drilldown(nodes, scope);
  return [...view.inside.filter((node) => node.kind === level), ...view.outside];
}

/** A partial overlap counts as inside. Touching edges alone do not. */
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
