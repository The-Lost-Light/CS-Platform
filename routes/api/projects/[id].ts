import { defineAdminMutationHandler } from "@server/access";
import { deleteProject, listProjects, saveProject, readProjectInput } from "@server/projects";

export const PATCH = defineAdminMutationHandler(async (c, user) => {
  const id = c.req.param("id") ?? "";
  const existing = (await listProjects()).find((project) => project.id === id);
  if (!existing) return c.json({ error: "notFound" }, 404);
  const parsed = await readProjectInput(c.req.raw, existing.attachments);
  if (!parsed) return c.json({ error: "invalid" }, 400);
  const project = await saveProject(parsed, user.id, existing.id);
  if (!project) return c.json({ error: "notFound" }, 404);
  return { project };
});

export const DELETE = defineAdminMutationHandler(async (c) => {
  if (!(await deleteProject(c.req.param("id") ?? ""))) return c.json({ error: "notFound" }, 404);
  return { success: true };
});
