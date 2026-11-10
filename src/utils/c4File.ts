import type { C4Kind, C4Node, C4Relationship } from './c4Model';

export interface C4File {
  format: 'codepulse-c4';
  version: 1;
  nodes: C4Node[];
  relationships: C4Relationship[];
}

export const C4_FILE_MAX_BYTES = 5 * 1024 * 1024;
const kinds: C4Kind[] = ['person', 'system', 'container', 'component', 'code'];
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const invalid = (): never => { throw new Error('Invalid C4 model file'); };

export function serializeC4File(nodes: C4Node[], relationships: C4Relationship[]): string {
  return JSON.stringify({ format: 'codepulse-c4', version: 1, nodes, relationships } satisfies C4File, null, 2);
}

/** Validate the entire graph before allowing the caller to replace any existing data. */
export function parseC4File(text: string): C4File {
  const data: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!object(data) || data.format !== 'codepulse-c4' || data.version !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.relationships)) return invalid();
  const ids = new Set<string>();
  const nodes = data.nodes.map((value: unknown): C4Node => {
    if (!object(value)) return invalid();
    const { id, kind, label, category, parentId, description, technology, expectedPath, x, y } = value;
    if (typeof id !== 'string' || !id.trim() || id === '__c4_boundary__' || ids.has(id) ||
      !kinds.includes(kind as C4Kind) || typeof label !== 'string' || typeof category !== 'string' ||
      !(parentId === null || typeof parentId === 'string' && !!parentId.trim()) ||
      typeof description !== 'string' || typeof technology !== 'string' || typeof expectedPath !== 'string' ||
      typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) return invalid();
    if (value.external !== undefined && typeof value.external !== 'boolean') return invalid();
    const dimensions: Pick<C4Node, 'width' | 'height'> = {};
    for (const key of ['width', 'height'] as const) {
      const size = value[key];
      if (size === undefined) continue;
      if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return invalid();
      dimensions[key] = size;
    }
    const layout: Pick<C4Node, 'boundary' | 'contextPositions'> = {};
    if (value.boundary !== undefined) {
      if (!object(value.boundary)) return invalid();
      const { x, y, width, height } = value.boundary;
      if (![x, y, width, height].every(n => typeof n === 'number' && Number.isFinite(n)) || (width as number) <= 0 || (height as number) <= 0) return invalid();
      layout.boundary = { x: x as number, y: y as number, width: width as number, height: height as number };
    }
    if (value.contextPositions !== undefined) {
      if (!object(value.contextPositions)) return invalid();
      layout.contextPositions = Object.create(null);
      for (const [key, position] of Object.entries(value.contextPositions)) {
        if (!object(position) || typeof position.x !== 'number' || !Number.isFinite(position.x) || typeof position.y !== 'number' || !Number.isFinite(position.y)) return invalid();
        layout.contextPositions![key] = { x: position.x, y: position.y };
      }
    }
    ids.add(id);
    return { id, kind: kind as C4Kind, label, category, parentId, description, technology, expectedPath, x, y, ...dimensions, ...layout, ...(value.external === undefined ? {} : { external: value.external as boolean }) };
  });
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (nodes.some(node => node.parentId && byId.get(node.parentId)?.external)) return invalid();
  const checked = new Set<string>();
  for (const node of nodes) {
    const path = new Set<string>();
    let current: C4Node | undefined = node;
    while (current && !checked.has(current.id)) {
      if (path.has(current.id)) return invalid();
      path.add(current.id);
      if (current.parentId !== null && !byId.has(current.parentId)) return invalid();
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    path.forEach(id => checked.add(id));
  }
  const edgeIds = new Set<string>();
  const relationships = data.relationships.map((value: unknown): C4Relationship => {
    if (!object(value)) return invalid();
    const { id, source, target, label, technology } = value;
    if (typeof id !== 'string' || !id.trim() || edgeIds.has(id) || typeof source !== 'string' || !ids.has(source) ||
      typeof target !== 'string' || !ids.has(target) || source === target || typeof label !== 'string' || typeof technology !== 'string') return invalid();
    edgeIds.add(id);
    return { id, source, target, label, technology };
  });
  return { format: 'codepulse-c4', version: 1, nodes, relationships };
}
