import { projectAttachmentParts as parts, projects, removedProjects, workspaces } from "@db/schema";
import type { Locale } from "@modules/i18n";
import {
  PROJECTS,
  getLocalizedProjects,
  mergeProjectCatalog,
  type ProjectAttachment,
} from "@modules/projects";
import { isUniqueViolation } from "@server/errors";
import { and, db, desc, eq, notInArray, sql } from "void/db";

import { attachmentMetadata, insertAttachmentParts } from "./attachments";
import type { ProjectInput } from "./input";

export { downloadProjectAttachment } from "./attachments";
export { readProjectInput } from "./input";

export async function listProjects(locale: Locale = "en") {
  const [rows, files, removed] = await db.batch([
    db.select({ data: projects.data }).from(projects).orderBy(desc(projects.createdAt)),
    db
      .select({ projectId: parts.projectId, ...attachmentMetadata })
      .from(parts)
      .where(eq(parts.part, 0))
      .orderBy(parts.name, parts.attachmentId),
    db.select().from(removedProjects),
  ]);
  const attachments = new Map<string, ProjectAttachment[]>();
  for (const { projectId, ...file } of files) {
    const group = attachments.get(projectId) ?? [];
    group.push(file);
    attachments.set(projectId, group);
  }
  return mergeProjectCatalog(
    getLocalizedProjects(locale).projects,
    rows.map(({ data }) => {
      const { summary: _, ...project } = data as typeof data & { summary?: unknown };
      return { ...project, attachments: attachments.get(data.id) ?? [] };
    }),
    removed.map((row) => row.id),
  );
}

export function availableProject(id: string) {
  const builtIn = PROJECTS.some((project) => project.id === id);
  return sql`NOT EXISTS (SELECT 1 FROM ${removedProjects} WHERE ${removedProjects.id} = ${id})
    AND (${Number(builtIn)} OR EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${id}))`;
}

export async function saveProject(input: ProjectInput, userId: string, existingId?: string) {
  const id = existingId ?? crypto.randomUUID();
  const data = { ...input.project, id };
  if (PROJECTS.some((item) => item.id !== id && item.codeName === data.codeName)) return null;
  const row = { id, codeName: data.codeName, data, createdBy: userId, createdAt: Date.now() };
  // A teacher can still have the editor open after another teacher deletes this project.
  const write = existingId
    ? db
        .insert(projects)
        .select(sql`SELECT ${id}, ${data.codeName}, ${JSON.stringify(data)}, ${userId}, ${row.createdAt}
        WHERE ${availableProject(id)}`)
        .onConflictDoUpdate({ target: projects.id, set: { codeName: data.codeName, data } })
    : db.insert(projects).values(row);
  const keepIds = input.retained.map((file) => file.id);
  const uploads = await insertAttachmentParts(id, input.uploads);
  try {
    // Metadata and file edits share one transaction, including a duplicate-code rollback.
    const result = await db.batch([
      write.returning({ id: projects.id }),
      db
        .delete(parts)
        .where(
          and(
            eq(parts.projectId, id),
            keepIds.length ? notInArray(parts.attachmentId, keepIds) : undefined,
          ),
        ),
      ...uploads,
      db
        .select(attachmentMetadata)
        .from(parts)
        .where(and(eq(parts.projectId, id), eq(parts.part, 0)))
        .orderBy(parts.name, parts.attachmentId),
    ]);
    if (!result[0].length) return undefined;
    return { ...data, attachments: result.at(-1) as ProjectAttachment[] };
  } catch (error) {
    if (existingId && !(await db.get(sql`SELECT 1 WHERE ${availableProject(id)}`)))
      return undefined;
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

export async function deleteProject(id: string) {
  if (!(await listProjects()).some((project) => project.id === id)) return false;
  await db.batch([
    db.insert(removedProjects).values({ id }).onConflictDoNothing(),
    db.delete(workspaces).where(eq(workspaces.projectId, id)),
    db.delete(projects).where(eq(projects.id, id)),
  ]);
  return true;
}
