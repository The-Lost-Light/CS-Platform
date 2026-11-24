import {
  projectAttachments,
  projects,
  workspaces,
  type CustomProjectData,
  type StoredProjectData,
} from "@db/schema";
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
import { and, db, eq, inArray, notInArray, sql } from "void/db";

import { attachmentMetadata, insertAttachments } from "./attachments";
import type { ProjectInput } from "./input";

export { downloadProjectAttachment } from "./attachments";
export { readProjectInput } from "./input";

function isUneditedBuiltInData(data: StoredProjectData): data is { id: string; customized: false } {
  return "customized" in data && data.customized === false;
}

function toStoredProjectData(
  project: Omit<Project, "index" | "attachments"> & { id: string },
): CustomProjectData {
  return {
    id: project.id,
    title: project.title,
    dueDate: project.dueDate,
    points: project.points,
    tags: project.tags,
    content: project.content,
  };
}

function nextProjectIndexSql() {
  const unstoredBuiltIns = PROJECTS.map(
    (item) =>
      sql`CASE WHEN NOT EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${item.id}) THEN ${item.index} ELSE 0 END`,
  );
  return sql`MAX(COALESCE((SELECT MAX(${projects.index}) FROM ${projects} WHERE ${projects.deleted} = 0), 0), ${sql.join(unstoredBuiltIns, sql`, `)}) + 1`;
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
    db.select({ id: projects.id }).from(projects).where(eq(projects.deleted, true)),
  ] as const;
}

function assembleCatalog(
  locale: Locale,
  rows: Array<{ id: string; index: number; data: StoredProjectData }>,
  files: Array<ProjectAttachment & { projectId: string }>,
  deleted: Array<{ id: string }>,
): Project[] {
  const attachments = new Map<string, ProjectAttachment[]>();
  for (const { projectId, ...file } of files) {
    const group = attachments.get(projectId) ?? [];
    group.push(file);
    attachments.set(projectId, group);
  }
  const localizedTemplates = getLocalizedProjects(locale).projects;
  const templateById = new Map(localizedTemplates.map((project) => [project.id, project]));
  return mergeProjectCatalog(
    localizedTemplates,
    rows.flatMap(({ id, index, data }) => {
      const rowAttachments = attachments.get(id) ?? [];
      if (isUneditedBuiltInData(data)) {
        const template = templateById.get(id);
        return template ? [{ ...template, id, index, attachments: rowAttachments }] : [];
      }
      const {
        summary: _,
        codeName: __,
        customized: ___,
        ...project
      } = data as CustomProjectData & {
        summary?: unknown;
        codeName?: unknown;
        customized?: unknown;
      };
      return [{ ...project, id, index, attachments: rowAttachments }];
    }),
    deleted.map((row) => row.id),
  );
}

export async function listProjects(locale: Locale = "en") {
  const [rows, files, deleted] = await db.batch([...catalogQueries()]);
  return assembleCatalog(locale, rows, files, deleted);
}

export async function listCatalog(
  locale: Locale = "en",
  userId?: string,
): Promise<{ projects: Project[]; workspaceStatuses: Record<string, ProjectWorkspaceStatus> }> {
  if (!userId) {
    return { projects: await listProjects(locale), workspaceStatuses: {} };
  }
  const [rows, files, deleted, userWorkspaces] = await db.batch([
    ...catalogQueries(),
    db
      .select({ projectId: workspaces.projectId, updatedAt: workspaces.updatedAt })
      .from(workspaces)
      .where(eq(workspaces.userId, userId)),
  ]);
  const catalog = assembleCatalog(locale, rows, files, deleted);
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
  const [row] = await db
    .select({ data: projects.data, deleted: projects.deleted })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (row) {
    if (row.deleted) return null;
    if (!isUneditedBuiltInData(row.data)) return { dueDate: row.data.dueDate };
  }
  const builtIn = PROJECTS.find((project) => project.id === id);
  return builtIn ? { dueDate: builtIn.dueDate } : null;
}

export function availableProject(id: string) {
  const builtIn = PROJECTS.some((project) => project.id === id);
  return builtIn
    ? sql`NOT EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${id} AND ${projects.deleted} = 1)`
    : sql`EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${id} AND ${projects.deleted} = 0)`;
}

export async function projectExists(id: string) {
  return Boolean(await db.get(sql`SELECT 1 WHERE ${availableProject(id)}`));
}

export async function saveProject(input: ProjectInput, userId: string, existingId?: string) {
  const id = existingId ?? crypto.randomUUID();
  const data = toStoredProjectData({ ...input.project, id });
  const createdAt = Date.now();
  const builtIn = PROJECTS.find((item) => item.id === id);
  // A teacher can still have the editor open after another teacher deletes this project.
  const write = existingId
    ? db
        .insert(projects)
        .select(
          sql`SELECT
            ${id},
            COALESCE((SELECT ${projects.index} FROM ${projects} WHERE ${projects.id} = ${id}), ${builtIn?.index ?? 0}),
            ${JSON.stringify(data)},
            ${userId},
            ${createdAt},
            0
          WHERE ${availableProject(id)}`,
        )
        .onConflictDoUpdate({
          target: projects.id,
          set: { data },
          setWhere: eq(projects.deleted, false),
        })
    : db.insert(projects).select(
        sql`SELECT
            ${id},
            ${nextProjectIndexSql()},
            ${JSON.stringify(data)},
            ${userId},
            ${createdAt},
            0`,
      );
  const keepIds = input.retained.map((file) => file.id);
  const uploads = await insertAttachments(id, input.uploads);
  try {
    const result = await db.batch([
      write.returning({ id: projects.id, index: projects.index }),
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

export async function deleteProject(id: string, userId = "system") {
  const current = await listProjects("en");
  if (!current.some((project) => project.id === id)) return false;
  const allActiveIds = current.map((project) => project.id);
  const remainingIds = allActiveIds.filter((activeId) => activeId !== id);
  const now = Date.now();
  const result = await db.batch([
    db
      .update(projects)
      .set({ index: 0 })
      .where(and(eq(projects.deleted, false), inArray(projects.id, allActiveIds))),
    ...PROJECTS.map((builtIn) =>
      db
        .insert(projects)
        .values({
          id: builtIn.id,
          index: 0,
          data: { id: builtIn.id, customized: false },
          createdBy: userId,
          createdAt: now,
          deleted: false,
        })
        .onConflictDoNothing(),
    ),
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
  const deletedRows = result[1 + PROJECTS.length] as Array<{ id: string }>;
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

export async function reorderProjects(
  body: unknown,
  userId: string,
  locale: Locale = "en",
): Promise<Project[] | "invalid" | "conflict"> {
  const orderedIds = parseReorderIds(body);
  if (!orderedIds) return "invalid";
  const current = await listProjects(locale);
  const activeIds = new Set(current.map((project) => project.id));
  if (orderedIds.length !== activeIds.size || orderedIds.some((id) => !activeIds.has(id))) {
    return "conflict";
  }
  if (orderedIds.length === 0) return [];
  const now = Date.now();
  try {
    const result = await db.batch([
      db
        .update(projects)
        .set({ index: 0 })
        .where(and(eq(projects.deleted, false), inArray(projects.id, orderedIds))),
      ...PROJECTS.map((builtIn) =>
        db
          .insert(projects)
          .values({
            id: builtIn.id,
            index: 0,
            data: { id: builtIn.id, customized: false },
            createdBy: userId,
            createdAt: now,
            deleted: false,
          })
          .onConflictDoNothing(),
      ),
      db
        .update(projects)
        .set({ index: buildCaseIndexSql(orderedIds) })
        .where(and(eq(projects.deleted, false), inArray(projects.id, orderedIds))),
      ...catalogQueries(),
    ]);
    const rows = result.at(-3) as Array<{ id: string; index: number; data: StoredProjectData }>;
    const files = result.at(-2) as Array<ProjectAttachment & { projectId: string }>;
    const deleted = result.at(-1) as Array<{ id: string }>;
    return assembleCatalog(locale, rows, files, deleted);
  } catch (error) {
    if (isUniqueViolation(error)) return "conflict";
    throw error;
  }
}
