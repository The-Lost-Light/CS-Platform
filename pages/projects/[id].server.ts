import { projectExists } from "@server/projects";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const ssr = false;

export const loader = defineHandler(async (c) => {
  requireAuth(c, { throwRedirect: "/" });
  const id = c.req.param("id") ?? "";
  if (!(await projectExists(id))) return c.notFound();
  return {};
});
