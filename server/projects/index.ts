import {
  PROJECTS,
  type Project,
  getLocalizedProjects,
  mergeProjectCatalog,
} from "@modules/projects";
import { isUniqueViolation } from "@server/errors";
import { db, desc, eq, sql } from "void/db";
import { projects, removedProjects, workspaces } from "@db/schema";
import type { Locale } from "@modules/i18n";

export async function listProjects(locale: Locale = "en") {
  const rows = await db
    .select({ data: projects.data })
    .from(projects)
    .orderBy(desc(projects.createdAt));
  const removed = (await db.select().from(removedProjects)).map((row) => row.id);
  const templates = getLocalizedProjects(locale).projects;
  return mergeProjectCatalog(
    templates,
    rows.map((row) => row.data),
    removed,
  );
}

export function availableProject(id: string) {
  const builtIn = PROJECTS.some((project) => project.id === id);
  return sql`NOT EXISTS (SELECT 1 FROM ${removedProjects} WHERE ${removedProjects.id} = ${id})
    AND (${Number(builtIn)} OR EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${id}))`;
}

export async function createProject(input: Omit<Project, "id">, userId: string) {
  if (PROJECTS.some((project) => project.codeName.toUpperCase() === input.codeName)) return null;
  const project = { ...input, id: crypto.randomUUID() };
  const inserted = await db
    .insert(projects)
    .values({
      id: project.id,
      codeName: project.codeName,
      data: project,
      createdBy: userId,
      createdAt: Date.now(),
    })
    .onConflictDoNothing()
    .returning({ id: projects.id });
  return inserted.length ? project : null;
}

export async function updateProject(
  existing: Project,
  parsed: Omit<Project, "id">,
  userId: string,
) {
  const { id } = existing;
  if (PROJECTS.some((project) => project.id !== id && project.codeName === parsed.codeName))
    return null;
  const project = {
    ...existing,
    ...parsed,
    id,
    initialMindMapNodes: existing.initialMindMapNodes,
    difficulty: existing.difficulty,
    difficultyColor: existing.difficultyColor,
    status: existing.status,
  };
  try {
    await db
      .insert(projects)
      .values({
        id,
        codeName: project.codeName,
        data: project,
        createdBy: userId,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: { codeName: project.codeName, data: project },
      });
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
  return project;
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
