import { availableProject } from "@server/projects";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, sql } from "void/db";

export const ssr = false;

export const loader = defineHandler(async (c) => {
  requireAuth(c, { throwRedirect: "/" });
  const id = c.req.param("id") ?? "";
  if (!(await db.get(sql`SELECT 1 WHERE ${availableProject(id)}`))) return c.notFound();
  return {};
});
