import type { MindMapNode } from '../types';

export type C4Kind = 'person' | 'system' | 'container' | 'component' | 'code';
export type C4Node = MindMapNode & { kind: C4Kind; technology: string };
export interface C4Relationship { id: string; source: string; target: string; label: string; technology: string }
export const parentKind: Partial<Record<C4Kind, C4Kind>> = { container: 'system', component: 'container', code: 'component' };

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
