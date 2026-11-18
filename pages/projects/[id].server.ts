import { PROJECTS } from "@data/projectsData";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, eq } from "void/db";
import { projects } from "../../db/schema";

export const ssr = false;

export const loader = defineHandler(async (c) => {
  requireAuth(c, { throwRedirect: "/" });
  const id = c.req.param("id") ?? "";
  if (!PROJECTS.some((project) => project.id === id)) {
    const rows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (!rows.length) return c.notFound();
  }
  return {};
});
