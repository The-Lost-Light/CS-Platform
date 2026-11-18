import { sqliteTable, text, integer, primaryKey, unique } from "void/schema-d1";
import { userTable } from "../.void/better-auth-schema";
import type { Project } from "@modules/projects";

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

export const workspaces = sqliteTable(
  "personal_workspace",
  {
    revision: text("revision").primaryKey(),
    projectId: text("project_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
  },
  (table) => [unique().on(table.projectId, table.userId)],
);

// A supported C4 import can exceed D1's maximum size for a single row.
export const workspaceParts = sqliteTable(
  "personal_workspace_part",
  {
    revision: text("revision")
      .notNull()
      .references(() => workspaces.revision, { onDelete: "cascade" }),
    part: integer("part").notNull(),
    content: text("content").notNull(),
  },
  (table) => [primaryKey({ columns: [table.revision, table.part] })],
);
