import { resolveLocale } from "@modules/i18n";
import { allowsAdminMutation } from "@server/access";
import { listCatalog, readProjectInput, saveProject } from "@server/projects";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  c.header("Cache-Control", "private, no-store");
  return await listCatalog(resolveLocale(c.req.query("locale")), user.id);
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
