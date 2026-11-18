import type { Project } from "@domain/project";

export function parseProjectInput(input: unknown): Omit<Project, "id"> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const limits = {
    codeName: 30,
    title: 120,
    summary: 2000,
    dueDate: 16,
    defaultRepoUrl: 300,
    tags: 500,
    requirements: 8000,
    initialDesignDoc: 20000,
  };
  const fields: Record<string, string> = {};
  for (const [key, max] of Object.entries(limits)) {
    if (typeof value[key] !== "string" || value[key].length > max) return null;
    fields[key] = value[key].trim();
  }
  const codeName = fields.codeName.toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(codeName) || !fields.title || !fields.summary) return null;
  if (
    typeof value.points !== "number" ||
    !Number.isInteger(value.points) ||
    value.points < 0 ||
    value.points > 10000
  )
    return null;
  if (fields.dueDate) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fields.dueDate)) return null;
    const date = new Date(fields.dueDate + ":00Z");
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== fields.dueDate)
      return null;
  }
  if (
    fields.defaultRepoUrl &&
    !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(fields.defaultRepoUrl)
  )
    return null;
  return {
    type: "project",
    codeName,
    title: fields.title,
    summary: fields.summary,
    dueDate: fields.dueDate.replace("T", " "),
    points: value.points,
    defaultRepoUrl: fields.defaultRepoUrl,
    tags: [
      ...new Set(
        fields.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ],
    requirements: fields.requirements
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    initialDesignDoc: fields.initialDesignDoc,
    difficulty: "",
    difficultyColor: "indigo",
    status: "",
    initialMindMapNodes: [
      {
        id: "root",
        label: fields.title,
        category: "root",
        expectedPath: "README.md",
        description: fields.summary,
        parentId: null,
        x: 380,
        y: 55,
      },
    ],
  };
}
