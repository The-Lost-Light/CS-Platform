import { PROJECTS } from "@data/projectsData";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const ssr = false;

export const loader = defineHandler((c) => {
  requireAuth(c, { throwRedirect: "/" });
  if (!PROJECTS.some((project) => project.id === c.req.param("id"))) return c.notFound();
  return {};
});
