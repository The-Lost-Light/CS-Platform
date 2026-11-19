import { isRecord } from "@shared/isRecord";
import { MAX_CONTENT_LENGTH, type Project } from "./project";

export function parseProjectInput(value: unknown): Omit<Project, "id" | "attachments"> | null {
  if (!isRecord(value)) return null;
  const limits = {
    codeName: 30,
    title: 120,
    summary: 2000,
    dueDate: 16,
    tags: 500,
    content: MAX_CONTENT_LENGTH,
  };
  const fields: Record<string, string> = {};
  for (const [key, max] of Object.entries(limits)) {
    if (typeof value[key] !== "string" || value[key].length > max) return null;
    // Markdown indentation and trailing newlines can be meaningful.
    fields[key] = key === "content" ? value[key] : value[key].trim();
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
  return {
    codeName,
    title: fields.title,
    summary: fields.summary,
    dueDate: fields.dueDate.replace("T", " "),
    points: value.points,
    tags: [
      ...new Set(
        fields.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ],
    content: fields.content,
  };
}
