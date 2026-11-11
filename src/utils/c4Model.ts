import type { MindMapNode } from '../types';

export type C4Kind = 'person' | 'system' | 'container' | 'component' | 'code';
export type C4Node = MindMapNode & { kind: C4Kind; external?: boolean; technology: string; width?: number; height?: number; boundary?: { x: number; y: number; width: number; height: number }; contextPositions?: Record<string, { x: number; y: number }> };
export interface C4Relationship { id: string; source: string; target: string; label: string; technology: string }
export const parentKind: Partial<Record<C4Kind, C4Kind>> = { container: 'system', component: 'container', code: 'component' };
export const C4_MAX_LEVELS = 4;

export function c4NodeDepth(nodes: C4Node[], id: string): number {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current) {
    if (seen.has(current.id)) return Infinity;
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return seen.size;
}

export function canExploreC4Node(nodes: C4Node[], id: string): boolean {
  const node = nodes.find(node => node.id === id);
  return !!node && !node.external && node.kind !== 'code' && c4NodeDepth(nodes, id) < C4_MAX_LEVELS;
}

export function createC4NodeInScope(nodes: C4Node[], scopeId: string, id: string, label: string, position?: { x: number; y: number }): C4Node | undefined {
  const scope = nodes.find(node => node.id === scopeId);
  if (scopeId && !canExploreC4Node(nodes, scopeId)) return undefined;
  const children: Record<C4Kind, C4Kind> = { person: 'component', system: 'container', container: 'component', component: 'code', code: 'code' };
  const kind = scope ? children[scope.kind] : 'system';
  if (!kind) return undefined;
  const parentId = scope?.id ?? null;
  const siblings = nodes.filter(node => (node.parentId || null) === parentId);
  // Place below existing siblings, including manually moved nodes, without overlapping them.
  return { id, label, kind, category: kind, parentId, description: '', technology: '', expectedPath: '',
    x: position?.x ?? 0, y: position?.y ?? (siblings.length ? Math.max(...siblings.map(node => node.y + (node.height ?? 230))) + 50 : 0) };
}

/** Show only elements created at the current level. */
export function c4Drilldown(nodes: C4Node[], scopeId: string) {
  const path: C4Node[] = [];
  const seen = new Set<string>();
  let current = nodes.find(node => node.id === scopeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = nodes.find(node => node.id === current?.parentId);
  }
  path.splice(C4_MAX_LEVELS - 1);
  const scope = path.at(-1);
  const inside = nodes.filter(node => scope ? node.parentId === scope.id : !node.parentId);
  const outside: C4Node[] = [];
  const visible = inside;
  return { path, scope, inside, outside, visible };
}

/** Preserve the existing path mappings while introducing explicit C4 containment. */
export function migrateC4Nodes(nodes: MindMapNode[]): C4Node[] {
  const root = nodes.find(node => !node.parentId);
  const migrated = nodes.map((node, index) => {
    const kind: C4Kind = node === root ? 'system' : node.parentId === root?.id || node.category === 'database' ? 'container' : 'component';
    return { ...node, kind, technology: '', parentId: kind === 'container' ? root?.id ?? null : node.parentId,
      x: (index % 3) * 310, y: Math.floor(index / 3) * 240 };
  });
  // Tests and documentation describe implementation; they are not deployable containers.
  const container = migrated.find(node => node.kind === 'container' && !['testing', 'database'].includes(node.category));
  if (container) migrated.forEach(node => {
    if (node.category === 'testing' || node.expectedPath.startsWith('docs/')) {
      node.kind = 'component';
      node.parentId = migrated.find(parent => parent.id === node.parentId && parent.kind === 'container')?.id || container.id;
    }
  });
  return migrated;
}

export function removeC4Nodes(nodes: C4Node[], ids: string[]) {
  const removed = new Set(ids);
  let size = -1;
  while (size !== removed.size) {
    size = removed.size;
    nodes.forEach(node => { if (node.parentId && removed.has(node.parentId)) removed.add(node.id); });
  }
  return nodes.filter(node => !removed.has(node.id));
}

export function visibleC4Nodes(nodes: C4Node[], level: C4Kind, scope: string): C4Node[] {
  if (level === 'system') return nodes.filter(node => node.kind === 'person' || node.kind === 'system');
  const view = c4Drilldown(nodes, scope);
  return [...view.inside.filter(node => node.kind === level), ...view.outside];
}

/** Membership is determined geometrically at the start of a boundary drag. */
export function overlapsC4Boundary(node: { x: number; y: number; width: number; height: number }, boundary: { x: number; y: number; width: number; height: number }): boolean {
  return node.x < boundary.x + boundary.width && node.x + node.width > boundary.x &&
    node.y < boundary.y + boundary.height && node.y + node.height > boundary.y;
}
