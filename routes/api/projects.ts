import { allowsAdminMutation } from "@server/access";
import { saveProject, listProjects, readProjectInput } from "@server/projects";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler(async (c) => {
  requireAuth(c);
  return { projects: await listProjects(c.req.query("locale") === "zh-TW" ? "zh-TW" : "en") };
});

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!allowsAdminMutation(user, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const parsed = await readProjectInput(c.req.raw);
  if (!parsed) return c.json({ error: "invalid" }, 400);
  const project = await saveProject(parsed, user.id);
  if (!project) return c.json({ error: "duplicate" }, 409);
  return c.json({ project }, 201);
});
