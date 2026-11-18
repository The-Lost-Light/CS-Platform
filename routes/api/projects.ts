import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db } from "void/db";
import { projects } from "../../db/schema";
import { PROJECTS } from "@data/projectsData";
import { parseProjectInput } from "@domain/projectInput";
import { listProjects } from "../../server/projects";

export const GET = defineHandler(async (c) => {
  requireAuth(c);
  return { projects: await listProjects(c.req.query("locale") === "zh-TW" ? "zh-TW" : "en") };
});

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!("role" in user) || user.role !== "admin") return c.json({ error: "forbidden" }, 403);
  if (c.req.header("origin") !== new URL(c.req.url).origin)
    return c.json({ error: "forbidden" }, 403);
  const body = await c.req.text();
  if (body.length > 40000) return c.json({ error: "invalid" }, 400);
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return c.json({ error: "invalid" }, 400);
  }
  const parsed = parseProjectInput(input);
  if (!parsed) return c.json({ error: "invalid" }, 400);
  if (PROJECTS.some((project) => project.codeName.toUpperCase() === parsed.codeName))
    return c.json({ error: "duplicate" }, 409);
  const project = { ...parsed, id: crypto.randomUUID() };
  const inserted = await db
    .insert(projects)
    .values({
      id: project.id,
      codeName: project.codeName,
      data: project,
      createdBy: user.id,
      createdAt: Date.now(),
    })
    .onConflictDoNothing()
    .returning({ id: projects.id });
  if (!inserted.length) return c.json({ error: "duplicate" }, 409);
  return c.json({ project }, 201);
});
