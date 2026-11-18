import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, eq } from "void/db";
import { projects, removedProjects } from "../../../db/schema";
import { listProjects } from "../../../server/projects";
import { PROJECTS } from "@data/projectsData";
import { parseProjectInput } from "@domain/projectInput";
import { isUniqueViolation } from "../../../server/errors";

export const PATCH = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (
    !("role" in user) ||
    user.role !== "admin" ||
    c.req.header("origin") !== new URL(c.req.url).origin
  )
    return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id") ?? "";
  const existing = (await listProjects(c.req.query("locale") === "zh-TW" ? "zh-TW" : "en")).find(
    (project) => project.id === id,
  );
  if (!existing) return c.json({ error: "notFound" }, 404);
  const text = await c.req.text();
  if (text.length > 40000) return c.json({ error: "invalid" }, 400);
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return c.json({ error: "invalid" }, 400);
  }
  const parsed = parseProjectInput(input);
  if (!parsed) return c.json({ error: "invalid" }, 400);
  if (PROJECTS.some((project) => project.id !== id && project.codeName === parsed.codeName))
    return c.json({ error: "duplicate" }, 409);
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
        createdBy: user.id,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: { codeName: project.codeName, data: project },
      });
  } catch (error) {
    if (isUniqueViolation(error)) return c.json({ error: "duplicate" }, 409);
    throw error;
  }
  return { project };
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (
    !("role" in user) ||
    user.role !== "admin" ||
    c.req.header("origin") !== new URL(c.req.url).origin
  )
    return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id") ?? "";
  if (!(await listProjects()).some((project) => project.id === id))
    return c.json({ error: "notFound" }, 404);
  await db.batch([
    db.insert(removedProjects).values({ id }).onConflictDoNothing(),
    db.delete(projects).where(eq(projects.id, id)),
  ]);
  return { success: true };
});
