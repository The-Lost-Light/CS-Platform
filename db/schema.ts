import type { Project } from "@modules/projects";
import { sql } from "void/_db";
import {
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "void/schema-d1";

import { userTable } from "../.void/better-auth-schema";

export type StoredProjectData = Omit<Project, "index" | "attachments">;

export const projects = sqliteTable(
  "course_project",
  {
    id: text("id").primaryKey(),
    index: integer("project_index").notNull(),
    data: text("data", { mode: "json" }).$type<StoredProjectData>().notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at").notNull(),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("course_project_active_index_unique")
      .on(table.index)
      .where(sql`${table.deleted} = 0 AND ${table.index} > 0`),
    index("course_project_deleted_index_idx").on(table.deleted, table.index, table.id),
  ],
);

// Store attachment metadata separately from chunk bytes so catalog reads never touch file content.
export const projectAttachments = sqliteTable(
  "project_attachment",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    attachmentId: text("attachment_id").notNull(),
    name: text("name").notNull(),
    size: integer("size").notNull(),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.attachmentId] }),
    index("project_attachment_order_idx").on(
      table.deleted,
      table.projectId,
      table.name,
      table.attachmentId,
      table.size,
    ),
  ],
);

export const projectAttachmentParts = sqliteTable(
  "project_attachment_part",
  {
    projectId: text("project_id").notNull(),
    attachmentId: text("attachment_id").notNull(),
    part: integer("part").notNull(),
    content: text("content").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.attachmentId, table.part] }),
    foreignKey({
      columns: [table.projectId, table.attachmentId],
      foreignColumns: [projectAttachments.projectId, projectAttachments.attachmentId],
    }).onDelete("cascade"),
  ],
);

export const workspaces = sqliteTable(
  "personal_workspace",
  {
    revision: text("revision").primaryKey(),
    projectId: text("project_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    unique().on(table.projectId, table.userId),
    index("personal_workspace_user_id_idx").on(table.userId),
  ],
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
