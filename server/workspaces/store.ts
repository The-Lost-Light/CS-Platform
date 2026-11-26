import { workspaces, workspaceParts } from "@db/schema";
import { validateC4File } from "@modules/c4-model";
import type {
  DesignEdit,
  PersonalWorkspace,
  StudentWorkspaceSummary,
  WorkspaceSnapshot,
} from "@modules/workspace";
import { isUniqueViolation } from "@server/errors";
import { availableProject, projectExists } from "@server/projects";
import { db, eq, sql, and } from "void/db";

import { userTable } from "../../.void/better-auth-schema";
import { designHistoryInserts, latestDesignVersion } from "./history";
import { splitWorkspaceContent } from "./parts";

const workspaceKey = (userId: string, projectId: string) =>
  and(eq(workspaces.userId, userId), eq(workspaces.projectId, projectId));

export async function loadWorkspace(
  userId: string,
  projectId: string,
  requireStudent = false,
): Promise<WorkspaceSnapshot | null> {
  const available = requireStudent
    ? sql`${availableProject(projectId)} AND EXISTS (
        SELECT 1 FROM ${userTable}
        WHERE ${userTable.id} = ${userId} AND ${userTable.deleted} = 0 AND COALESCE(${userTable.role}, 'user') != 'admin'
      )`
    : sql`${availableProject(projectId)} AND EXISTS (
        SELECT 1 FROM ${userTable}
        WHERE ${userTable.id} = ${userId} AND ${userTable.deleted} = 0
      )`;
  if (!(await db.get(sql`SELECT 1 WHERE ${available}`))) return null;
  const rows = await db
    .select({
      revision: workspaces.revision,
      updatedAt: workspaces.updatedAt,
      content: workspaceParts.content,
    })
    .from(workspaces)
    .innerJoin(workspaceParts, eq(workspaces.revision, workspaceParts.revision))
    .where(workspaceKey(userId, projectId))
    .orderBy(workspaceParts.part);
  const draft: PersonalWorkspace | null = rows.length
    ? JSON.parse(rows.map((row) => row.content).join(""))
    : null;
  if (draft) draft.model = validateC4File(draft.model);
  return {
    accountId: userId,
    revision: rows[0]?.revision ?? null,
    updatedAt: rows[0]?.updatedAt ?? null,
    draft,
  };
}

export async function listStudentWorkspaces(
  projectId: string,
): Promise<StudentWorkspaceSummary[] | null> {
  if (!(await projectExists(projectId))) return null;
  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      revision: workspaces.revision,
      updatedAt: workspaces.updatedAt,
    })
    .from(userTable)
    .leftJoin(
      workspaces,
      and(eq(workspaces.userId, userTable.id), eq(workspaces.projectId, projectId)),
    )
    .where(sql`${userTable.deleted} = 0 AND COALESCE(${userTable.role}, 'user') != 'admin'`)
    .orderBy(
      sql`CASE WHEN ${workspaces.revision} IS NOT NULL THEN 0 ELSE 1 END`,
      userTable.name,
      userTable.email,
    );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    hasWorkspace: Boolean(row.revision),
    updatedAt: row.revision ? row.updatedAt : null,
  }));
}

export async function saveWorkspace(
  userId: string,
  projectId: string,
  previous: string | null,
  draft: PersonalWorkspace,
  base: PersonalWorkspace | null,
  edits: DesignEdit[],
  revision: string = crypto.randomUUID(),
) {
  const projectAvailable = sql`${availableProject(projectId)} AND EXISTS (
    SELECT 1 FROM ${userTable} WHERE ${userTable.id} = ${userId} AND ${userTable.deleted} = 0
  )`;
  const updatedAt = Date.now();
  const version = await latestDesignVersion(userId, projectId);
  const content = JSON.stringify(draft);
  const partInserts = splitWorkspaceContent(content).map((chunk, part) =>
    db.insert(workspaceParts).values({ revision, part, content: chunk }),
  );
  // Compare-and-swap and insert all parts in one transaction. A stale writer
  // collides with the current owner's unique key; its entire batch rolls back.
  try {
    await db.batch([
      db
        .delete(workspaces)
        .where(and(workspaceKey(userId, projectId), eq(workspaces.revision, previous ?? ""))),
      db
        .insert(workspaces)
        .select(
          sql`SELECT ${revision}, ${projectId}, ${userId}, ${updatedAt} WHERE ${projectAvailable}`,
        ),
      ...partInserts,
      ...designHistoryInserts(userId, projectId, version, base, edits),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      // A retry may race the original batch before either request receives its receipt.
      const accepted = await db.get<{ revision: string; updatedAt: number }>(
        sql`SELECT revision, updated_at AS updatedAt FROM ${workspaces}
          WHERE ${workspaceKey(userId, projectId)} AND revision = ${revision}`,
      );
      if (accepted?.revision === revision) return { status: "saved", ...accepted } as const;
      return { status: "conflict" } as const;
    }
    if (!(await projectExists(projectId))) return { status: "missing" } as const;
    throw error;
  }
  return { status: "saved", revision, updatedAt } as const;
}
