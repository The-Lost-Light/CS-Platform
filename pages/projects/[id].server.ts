import { PROJECTS } from "@data/projectsData";
import { defineHandler } from "void";

export const ssr = false;

export const loader = defineHandler((c) => {
  if (!PROJECTS.some((project) => project.id === c.req.param("id"))) return c.notFound();
  return {};
});
