import type { C4Node } from "@modules/c4-model";

const entries: Array<Pick<C4Node, "id" | "kind" | "category" | "parentId" | "x" | "y">> = [
  { id: "node-root", kind: "system", category: "root", parentId: null, x: 0, y: 0 },
  {
    id: "node-fe-core",
    kind: "container",
    category: "frontend",
    parentId: "node-root",
    x: 310,
    y: 0,
  },
  {
    id: "node-editor",
    kind: "component",
    category: "frontend",
    parentId: "node-fe-core",
    x: 620,
    y: 0,
  },
  { id: "node-api", kind: "container", category: "backend", parentId: "node-root", x: 0, y: 240 },
  { id: "node-db", kind: "container", category: "database", parentId: "node-root", x: 310, y: 240 },
  {
    id: "node-ai-service",
    kind: "component",
    category: "ai",
    parentId: "node-api",
    x: 620,
    y: 240,
  },
  {
    id: "node-tests",
    kind: "component",
    category: "testing",
    parentId: "node-fe-core",
    x: 0,
    y: 480,
  },
];

export const sampleC4Nodes: C4Node[] = entries.map((entry) => ({
  ...entry,
  label: entry.id,
  description: "",
  technology: "",
}));
