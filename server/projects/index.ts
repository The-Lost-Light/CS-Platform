import { projectAttachments, projects, removedProjects, workspaces } from "@db/schema";
import type { Locale } from "@modules/i18n";
import {
  PROJECTS,
  getLocalizedProjects,
  mergeProjectCatalog,
  type Project,
  type ProjectAttachment,
  type ProjectWorkspaceStatus,
} from "@modules/projects";
import { isUniqueViolation } from "@server/errors";
import { and, db, desc, eq, notInArray, sql } from "void/db";

import { attachmentMetadata, insertAttachments } from "./attachments";
import type { ProjectInput } from "./input";

export { downloadProjectAttachment } from "./attachments";
export { readProjectInput } from "./input";

function catalogQueries() {
  return [
    db.select({ data: projects.data }).from(projects).orderBy(desc(projects.createdAt)),
    db
      .select({ projectId: projectAttachments.projectId, ...attachmentMetadata })
      .from(projectAttachments)
      .orderBy(
        projectAttachments.projectId,
        projectAttachments.name,
        projectAttachments.attachmentId,
      ),
    db.select().from(removedProjects),
  ] as const;
}

function assembleCatalog(
  locale: Locale,
  rows: Array<{ data: Omit<Project, "attachments"> }>,
  files: Array<ProjectAttachment & { projectId: string }>,
  removed: Array<{ id: string }>,
): Project[] {
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

export async function listProjects(locale: Locale = "en") {
  const [rows, files, removed] = await db.batch([...catalogQueries()]);
  return assembleCatalog(locale, rows, files, removed);
}

export async function listCatalog(
  locale: Locale = "en",
  userId?: string,
): Promise<{ projects: Project[]; workspaceStatuses: Record<string, ProjectWorkspaceStatus> }> {
  if (!userId) {
    return { projects: await listProjects(locale), workspaceStatuses: {} };
  }
  const [rows, files, removed, userWorkspaces] = await db.batch([
    ...catalogQueries(),
    db
      .select({ projectId: workspaces.projectId, updatedAt: workspaces.updatedAt })
      .from(workspaces)
      .where(eq(workspaces.userId, userId)),
  ]);
  const catalog = assembleCatalog(locale, rows, files, removed);
  const visibleIds = new Set(catalog.map((project) => project.id));
  const workspaceStatuses: Record<string, ProjectWorkspaceStatus> = {};
  for (const row of userWorkspaces) {
    if (!visibleIds.has(row.projectId)) continue;
    workspaceStatuses[row.projectId] = {
      hasWorkspace: true,
      updatedAt: row.updatedAt > 0 ? row.updatedAt : null,
    };
  }
  return { projects: catalog, workspaceStatuses };
}

export async function getProjectDeadline(id: string): Promise<{ dueDate: string } | null> {
  const [rows, removed] = await db.batch([
    db.select({ data: projects.data }).from(projects).where(eq(projects.id, id)).limit(1),
    db.select().from(removedProjects).where(eq(removedProjects.id, id)).limit(1),
  ]);
  if (removed.length > 0) return null;
  if (rows.length > 0) return { dueDate: rows[0].data.dueDate };
  const builtIn = PROJECTS.find((project) => project.id === id);
  return builtIn ? { dueDate: builtIn.dueDate } : null;
}

export function availableProject(id: string) {
  const builtIn = PROJECTS.some((project) => project.id === id);
  return sql`NOT EXISTS (SELECT 1 FROM ${removedProjects} WHERE ${removedProjects.id} = ${id})
    AND (${Number(builtIn)} OR EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${id}))`;
}

export async function projectExists(id: string) {
  return Boolean(await db.get(sql`SELECT 1 WHERE ${availableProject(id)}`));
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
  const uploads = await insertAttachments(id, input.uploads);
  try {
    // Metadata and file edits share one transaction, including a duplicate-code rollback.
    const result = await db.batch([
      write.returning({ id: projects.id }),
      db
        .delete(projectAttachments)
        .where(
          and(
            eq(projectAttachments.projectId, id),
            keepIds.length ? notInArray(projectAttachments.attachmentId, keepIds) : undefined,
          ),
        ),
      ...uploads,
      db
        .select(attachmentMetadata)
        .from(projectAttachments)
        .where(eq(projectAttachments.projectId, id))
        .orderBy(projectAttachments.name, projectAttachments.attachmentId),
    ]);
    if (!result[0].length) return undefined;
    return { ...data, attachments: result.at(-1) as ProjectAttachment[] };
  } catch (error) {
    if (existingId && !(await projectExists(id))) return undefined;
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

export async function deleteProject(id: string) {
  if (!(await projectExists(id))) return false;
  await db.batch([
    db.insert(removedProjects).values({ id }).onConflictDoNothing(),
    db.delete(workspaces).where(eq(workspaces.projectId, id)),
    db.delete(projects).where(eq(projects.id, id)),
  ]);
  return true;
}
