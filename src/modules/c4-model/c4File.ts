import { isRecord } from "@shared/isRecord";

import { type C4Kind, type C4Node, type C4Relationship, C4_MAX_LEVELS } from "./c4";

export interface C4File {
  format: "codepulse-c4";
  version: 1;
  nodes: C4Node[];
  relationships: C4Relationship[];
}

export const C4_FILE_MAX_BYTES = 5 * 1024 * 1024;
const kinds: C4Kind[] = ["person", "system", "container", "component", "code"];
const invalid = (): never => {
  throw new Error("Invalid C4 model file");
};

export function serializeC4File(nodes: C4Node[], relationships: C4Relationship[]): string {
  return JSON.stringify(
    validateC4File({
      format: "codepulse-c4",
      version: 1,
      nodes,
      relationships,
    } satisfies C4File),
    null,
    2,
  );
}

/** Validate the entire graph before allowing the caller to replace any existing data. */
export function parseC4File(text: string): C4File {
  return validateC4File(JSON.parse(text.replace(/^\uFEFF/, "")));
}

export function validateC4File(data: unknown): C4File {
  if (
    !isRecord(data) ||
    data.format !== "codepulse-c4" ||
    data.version !== 1 ||
    !Array.isArray(data.nodes) ||
    !Array.isArray(data.relationships)
  )
    return invalid();
  const ids = new Set<string>();
  const nodes = data.nodes.map((value: unknown): C4Node => {
    if (!isRecord(value)) return invalid();
    const { id, kind, label, category, parentId, description, technology = "", x, y } = value;
    if (
      typeof id !== "string" ||
      !id.trim() ||
      id === "__c4_boundary__" ||
      ids.has(id) ||
      !kinds.includes(kind as C4Kind) ||
      typeof label !== "string" ||
      typeof category !== "string" ||
      !(parentId === null || (typeof parentId === "string" && !!parentId.trim())) ||
      typeof description !== "string" ||
      typeof technology !== "string" ||
      typeof x !== "number" ||
      !Number.isFinite(x) ||
      typeof y !== "number" ||
      !Number.isFinite(y)
    )
      return invalid();
    const dimensions: Pick<C4Node, "width" | "height"> = {};
    for (const key of ["width", "height"] as const) {
      const size = value[key];
      if (size === undefined) continue;
      if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return invalid();
      dimensions[key] = size;
    }
    const layout: Pick<C4Node, "boundary"> = {};
    if (value.boundary !== undefined) {
      if (!isRecord(value.boundary)) return invalid();
      const { x, y, width, height } = value.boundary;
      if (
        ![x, y, width, height].every((n) => typeof n === "number" && Number.isFinite(n)) ||
        (width as number) <= 0 ||
        (height as number) <= 0
      )
        return invalid();
      layout.boundary = {
        x: x as number,
        y: y as number,
        width: width as number,
        height: height as number,
      };
    }
    ids.add(id);
    return {
      id,
      kind: kind as C4Kind,
      label,
      category,
      parentId,
      description,
      technology,
      x,
      y,
      ...dimensions,
      ...layout,
    };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depths = new Map<string, number>();
  for (const node of nodes) {
    const path = new Set<string>();
    let current: C4Node | undefined = node;
    while (current && !depths.has(current.id)) {
      if (path.has(current.id) || path.size >= C4_MAX_LEVELS) return invalid();
      path.add(current.id);
      if (current.parentId !== null && !byId.has(current.parentId)) return invalid();
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    let depth = current ? depths.get(current.id)! : 0;
    for (const id of [...path].reverse()) {
      if (++depth > C4_MAX_LEVELS) return invalid();
      depths.set(id, depth);
    }
  }
  const edgeIds = new Set<string>();
  if (nodes.some((node) => node.parentId && byId.get(node.parentId)?.kind === "code"))
    return invalid();
  const relationships = data.relationships.map((value: unknown): C4Relationship => {
    if (!isRecord(value)) return invalid();
    const { id, source, target, label, technology } = value;
    if (
      typeof id !== "string" ||
      !id.trim() ||
      edgeIds.has(id) ||
      typeof source !== "string" ||
      !ids.has(source) ||
      typeof target !== "string" ||
      !ids.has(target) ||
      source === target ||
      typeof label !== "string" ||
      typeof technology !== "string"
    )
      return invalid();
    edgeIds.add(id);
    return { id, source, target, label, technology };
  });
  return { format: "codepulse-c4", version: 1, nodes, relationships };
}
