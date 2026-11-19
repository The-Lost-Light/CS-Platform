import { allowsAdminMutation } from "@server/access";
import { deleteProject, listProjects, saveProject, readProjectInput } from "@server/projects";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const PATCH = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!allowsAdminMutation(user, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id") ?? "";
  const existing = (await listProjects(c.req.query("locale") === "zh-TW" ? "zh-TW" : "en")).find(
    (project) => project.id === id,
  );
  if (!existing) return c.json({ error: "notFound" }, 404);
  const parsed = await readProjectInput(c.req.raw, existing.attachments);
  if (!parsed) return c.json({ error: "invalid" }, 400);
  const project = await saveProject(parsed, user.id, existing.id);
  if (project === undefined) return c.json({ error: "notFound" }, 404);
  if (!project) return c.json({ error: "duplicate" }, 409);
  return { project };
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!allowsAdminMutation(user, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!(await deleteProject(c.req.param("id") ?? ""))) return c.json({ error: "notFound" }, 404);
  return { success: true };
});
