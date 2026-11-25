import { projectAttachments, projects, workspaces, type StoredProjectData } from "@db/schema";
import type { Project, ProjectAttachment, ProjectWorkspaceStatus } from "@modules/projects";
import { isUniqueViolation } from "@server/errors";
import { and, db, eq, inArray, notInArray, sql } from "void/db";

import { attachmentMetadata, insertAttachments } from "./attachments";
import type { ProjectInput } from "./input";

export { downloadProjectAttachment } from "./attachments";
export { readProjectInput } from "./input";

function toStoredProjectData(
  project: Omit<Project, "index" | "attachments"> & { id: string },
): StoredProjectData {
  return {
    id: project.id,
    title: project.title,
    dueDate: project.dueDate,
    points: project.points,
    content: project.content,
  };
}

function nextProjectIndexSql() {
  return sql`COALESCE((SELECT MAX(${projects.index}) FROM ${projects} WHERE ${projects.deleted} = 0), 0) + 1`;
}

function buildCaseIndexSql(orderedIds: string[]) {
  const cases = orderedIds.map((id, index) => sql`WHEN ${projects.id} = ${id} THEN ${index + 1}`);
  return sql`CASE ${sql.join(cases, sql` `)} ELSE 0 END`;
}

function catalogQueries() {
  return [
    db
      .select({ id: projects.id, index: projects.index, data: projects.data })
      .from(projects)
      .where(eq(projects.deleted, false))
      .orderBy(projects.index),
    db
      .select({ projectId: projectAttachments.projectId, ...attachmentMetadata })
      .from(projectAttachments)
      .where(eq(projectAttachments.deleted, false))
      .orderBy(
        projectAttachments.projectId,
        projectAttachments.name,
        projectAttachments.attachmentId,
      ),
  ] as const;
}

function assembleCatalog(
  rows: Array<{ id: string; index: number; data: StoredProjectData }>,
  files: Array<ProjectAttachment & { projectId: string }>,
): Project[] {
  const attachments = new Map<string, ProjectAttachment[]>();
  for (const { projectId, ...file } of files) {
    const group = attachments.get(projectId) ?? [];
    group.push(file);
    attachments.set(projectId, group);
  }
  return rows.map(({ id, data }, idx) => ({
    id,
    index: idx + 1,
    title: data.title,
    dueDate: data.dueDate,
    points: data.points,
    content: data.content,
    attachments: attachments.get(id) ?? [],
  }));
}

export async function listProjects() {
  const [rows, files] = await db.batch([...catalogQueries()]);
  return assembleCatalog(rows, files);
}

export async function listCatalog(
  userId?: string,
): Promise<{ projects: Project[]; workspaceStatuses: Record<string, ProjectWorkspaceStatus> }> {
  if (!userId) {
    return { projects: await listProjects(), workspaceStatuses: {} };
  }
  const [rows, files, userWorkspaces] = await db.batch([
    ...catalogQueries(),
    db
      .select({ projectId: workspaces.projectId, updatedAt: workspaces.updatedAt })
      .from(workspaces)
      .where(eq(workspaces.userId, userId)),
  ]);
  const catalog = assembleCatalog(rows, files);
  const visibleIds = new Set(catalog.map((project) => project.id));
  const workspaceStatuses: Record<string, ProjectWorkspaceStatus> = {};
  for (const row of userWorkspaces) {
    if (!visibleIds.has(row.projectId)) continue;
    workspaceStatuses[row.projectId] = {
      hasWorkspace: true,
      updatedAt: row.updatedAt,
    };
  }
  return { projects: catalog, workspaceStatuses };
}

export async function getProjectDeadline(id: string): Promise<{ dueDate: string } | null> {
  const [row] = await db
    .select({ data: projects.data })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.deleted, false)))
    .limit(1);
  return row ? { dueDate: row.data.dueDate } : null;
}

export function availableProject(id: string) {
  return sql`EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${id} AND ${projects.deleted} = 0)`;
}

export async function projectExists(id: string) {
  return Boolean(await db.get(sql`SELECT 1 WHERE ${availableProject(id)}`));
}

export async function saveProject(input: ProjectInput, userId: string, existingId?: string) {
  const id = existingId ?? crypto.randomUUID();
  const data = toStoredProjectData({ ...input.project, id });
  const createdAt = Date.now();
  const write = existingId
    ? db
        .update(projects)
        .set({ data })
        .where(and(eq(projects.id, id), eq(projects.deleted, false)))
        .returning({ id: projects.id, index: projects.index })
    : db
        .insert(projects)
        .select(
          sql`SELECT
            ${id},
            ${nextProjectIndexSql()},
            ${JSON.stringify(data)},
            ${userId},
            ${createdAt},
            0`,
        )
        .returning({ id: projects.id, index: projects.index });
  const keepIds = input.retained.map((file) => file.id);
  const uploads = await insertAttachments(id, input.uploads);
  try {
    const result = await db.batch([
      write,
      db
        .update(projectAttachments)
        .set({ deleted: true })
        .where(
          and(
            eq(projectAttachments.projectId, id),
            eq(projectAttachments.deleted, false),
            keepIds.length ? notInArray(projectAttachments.attachmentId, keepIds) : undefined,
            existingId ? availableProject(id) : undefined,
          ),
        ),
      ...uploads,
      db
        .select(attachmentMetadata)
        .from(projectAttachments)
        .where(and(eq(projectAttachments.deleted, false), eq(projectAttachments.projectId, id)))
        .orderBy(projectAttachments.name, projectAttachments.attachmentId),
    ]);
    const [savedRow] = result[0] as Array<{ id: string; index: number }>;
    if (!savedRow) return undefined;
    return { ...data, index: savedRow.index, attachments: result.at(-1) as ProjectAttachment[] };
  } catch (error) {
    if (existingId && !(await projectExists(id))) return undefined;
    throw error;
  }
}

export async function deleteProject(id: string) {
  const current = await listProjects();
  if (!current.some((project) => project.id === id)) return false;
  const allActiveIds = current.map((project) => project.id);
  const remainingIds = allActiveIds.filter((activeId) => activeId !== id);
  const result = await db.batch([
    db
      .update(projects)
      .set({ index: 0 })
      .where(and(eq(projects.deleted, false), inArray(projects.id, allActiveIds))),
    db
      .update(projects)
      .set({ deleted: true, index: 0 })
      .where(and(eq(projects.id, id), eq(projects.deleted, false)))
      .returning({ id: projects.id }),
    ...(remainingIds.length > 0
      ? [
          db
            .update(projects)
            .set({ index: buildCaseIndexSql(remainingIds) })
            .where(and(eq(projects.deleted, false), inArray(projects.id, remainingIds))),
        ]
      : []),
  ]);
  const deletedRows = result[1] as Array<{ id: string }>;
  return deletedRows.length > 0;
}

function parseReorderIds(body: unknown): string[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "orderedIds") return null;
  const raw = (body as { orderedIds: unknown }).orderedIds;
  if (!Array.isArray(raw) || raw.length > 1000) return null;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (
      typeof item !== "string" ||
      item.trim() !== item ||
      item.length === 0 ||
      item.length > 128 ||
      seen.has(item)
    ) {
      return null;
    }
    seen.add(item);
    ids.push(item);
  }
  return ids;
}

export async function reorderProjects(body: unknown): Promise<Project[] | "invalid" | "conflict"> {
  const orderedIds = parseReorderIds(body);
  if (!orderedIds) return "invalid";
  const current = await listProjects();
  const activeIds = new Set(current.map((project) => project.id));
  if (orderedIds.length !== activeIds.size || orderedIds.some((id) => !activeIds.has(id))) {
    return "conflict";
  }
  if (orderedIds.length === 0) return [];
  try {
    const result = await db.batch([
      db
        .update(projects)
        .set({ index: 0 })
        .where(and(eq(projects.deleted, false), inArray(projects.id, orderedIds))),
      db
        .update(projects)
        .set({ index: buildCaseIndexSql(orderedIds) })
        .where(and(eq(projects.deleted, false), inArray(projects.id, orderedIds))),
      ...catalogQueries(),
    ]);
    const rows = result.at(-2) as Array<{ id: string; index: number; data: StoredProjectData }>;
    const files = result.at(-1) as Array<ProjectAttachment & { projectId: string }>;
    return assembleCatalog(rows, files);
  } catch (error) {
    if (isUniqueViolation(error)) return "conflict";
    throw error;
  }
}
