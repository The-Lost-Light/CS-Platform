import { defineAdminMutationHandler, isDeletedUser } from "@server/access";
import { listCatalog, readProjectInput, reorderProjects, saveProject } from "@server/projects";
import { readLimitedJson } from "@shared/http/readLimitedText";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

const MAX_REORDER_BODY_BYTES = 64 * 1024;

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (isDeletedUser(user)) return c.json({ error: "unauthorized" }, 401);
  c.header("Cache-Control", "private, no-store");
  return await listCatalog(user.id);
});

export const POST = defineAdminMutationHandler(async (c, user) => {
  const parsed = await readProjectInput(c.req.raw);
  if (!parsed) return c.json({ error: "invalid" }, 400);
  const project = await saveProject(parsed, user.id);
  if (!project) return c.json({ error: "failed" }, 500);
  return c.json({ project }, 201);
});

export const PUT = defineAdminMutationHandler(async (c) => {
  if (!c.req.raw.body) return c.json({ error: "invalid" }, 400);
  const parsed = await readLimitedJson(c.req.raw, MAX_REORDER_BODY_BYTES);
  if (!parsed.ok) return c.json({ error: "invalid" }, 400);
  const result = await reorderProjects(parsed.value);
  if (result === "invalid") return c.json({ error: "invalid" }, 400);
  if (result === "conflict") return c.json({ error: "conflict" }, 409);
  return { projects: result };
});
