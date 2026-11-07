import type { MindMapNode } from '../types';

export type C4Kind = 'person' | 'system' | 'container' | 'component' | 'code';
export type C4Node = MindMapNode & { kind: C4Kind; technology: string };
export interface C4Relationship { id: string; source: string; target: string; label: string; technology: string }
export const parentKind: Partial<Record<C4Kind, C4Kind>> = { container: 'system', component: 'container', code: 'component' };

export function createC4NodeInScope(nodes: C4Node[], scopeId: string, id: string, label: string): C4Node | undefined {
  const scope = nodes.find(node => node.id === scopeId);
  if (scopeId && !scope) return undefined;
  const children: Record<C4Kind, C4Kind> = { person: 'component', system: 'container', container: 'component', component: 'code', code: 'code' };
  const kind = scope ? children[scope.kind] : 'system';
  if (!kind) return undefined;
  const parentId = scope?.id ?? null;
  const siblings = nodes.filter(node => (node.parentId || null) === parentId);
  // Place below existing siblings, including manually moved nodes, without overlapping them.
  return { id, label, kind, category: kind, parentId, description: '', technology: '', expectedPath: '',
    x: 0, y: siblings.length ? Math.max(...siblings.map(node => node.y)) + 280 : 0 };
}

/** Display only direct children; retain ancestors solely for breadcrumb navigation. */
export function c4Drilldown(nodes: C4Node[], scopeId: string) {
  const path: C4Node[] = [];
  const seen = new Set<string>();
  let current = nodes.find(node => node.id === scopeId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = nodes.find(node => node.id === current?.parentId);
  }
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
  const ancestors = new Set<string>();
  let current = nodes.find(node => node.id === scope);
  while (current && !ancestors.has(current.id)) {
    ancestors.add(current.id);
    current = nodes.find(node => node.id === current?.parentId);
  }
  return nodes.filter(node => node.kind === 'person' || (node.kind === 'system' && !ancestors.has(node.id)) ||
    (level === 'component' && node.kind === 'container' && node.id !== scope) ||
    (node.kind === level && node.parentId === scope));
}
