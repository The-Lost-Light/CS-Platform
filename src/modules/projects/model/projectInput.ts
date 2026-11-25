import { isRecord } from "@shared/isRecord";

import { MAX_PROJECT_POINTS, PROJECT_FIELD_LIMITS, type Project } from "./project";

export function parseProjectInput(
  value: unknown,
): Omit<Project, "id" | "index" | "attachments"> | null {
  if (!isRecord(value)) return null;
  const fields: Record<string, string> = {};
  for (const [key, max] of Object.entries(PROJECT_FIELD_LIMITS)) {
    if (typeof value[key] !== "string" || value[key].length > max) return null;
    // Markdown indentation and trailing newlines can be meaningful.
    fields[key] = key === "content" ? value[key] : value[key].trim();
  }
  if (!fields.title) return null;
  if (
    typeof value.points !== "number" ||
    !Number.isInteger(value.points) ||
    value.points < 0 ||
    value.points > MAX_PROJECT_POINTS
  )
    return null;
  if (fields.dueDate) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fields.dueDate)) return null;
    const date = new Date(fields.dueDate + ":00Z");
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== fields.dueDate)
      return null;
  }
  return {
    title: fields.title,
    dueDate: fields.dueDate.replace("T", " "),
    points: value.points,
    content: fields.content,
  };
}
