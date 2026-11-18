import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { allowsAdminMutation } from "@server/access";
import { parseProjectInput } from "@modules/projects";
import { deleteProject, listProjects, updateProject } from "@server/projects";

export const PATCH = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!allowsAdminMutation(user, c.req.raw)) return c.json({ error: "forbidden" }, 403);
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
  const project = await updateProject(existing, parsed, user.id);
  if (!project) return c.json({ error: "duplicate" }, 409);
  return { project };
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!allowsAdminMutation(user, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!(await deleteProject(c.req.param("id") ?? ""))) return c.json({ error: "notFound" }, 404);
  return { success: true };
});
