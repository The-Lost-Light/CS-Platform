import { sqliteTable, text, integer } from "void/schema-d1";
import type { Project } from "../src/domain/project";

export const projects = sqliteTable("course_project", {
  id: text("id").primaryKey(),
  codeName: text("code_name").notNull().unique(),
  data: text("data", { mode: "json" }).$type<Project>().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
});

// Persist removal of built-in templates so they cannot reappear after a reload.
export const removedProjects = sqliteTable("removed_project", {
  id: text("id").primaryKey(),
});
