// Historical mind-map data used by the C4 import and migration checks.
const paths: [id: string, category: string, parentId: string | null, path: string][] = [
  ["node-root", "root", null, "README.md"],
  ["node-fe-core", "frontend", "node-root", "src/App.tsx"],
  ["node-editor", "frontend", "node-fe-core", "src/components/CodeEditor.tsx"],
  ["node-api", "backend", "node-root", "server/routes/submissions.ts"],
  ["node-db", "database", "node-api", "prisma/schema.prisma"],
  ["node-ai-service", "ai", "node-api", "server/services/aiTutor.ts"],
  ["node-tests", "testing", "node-root", "tests/submissions.test.ts"],
];
export const legacyNodes = paths.map(([id, category, parentId, expectedPath]) => ({
  id,
  label: id,
  category,
  parentId,
  expectedPath,
  description: "",
  x: 0,
  y: 0,
}));
