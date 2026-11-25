import { workspaces, workspaceParts } from "@db/schema";
import { validateC4File } from "@modules/c4-model";
import type {
  PersonalWorkspace,
  StudentWorkspaceSummary,
  WorkspaceSnapshot,
} from "@modules/workspace";
import { isUniqueViolation } from "@server/errors";
import { availableProject, projectExists } from "@server/projects";
import { db, eq, sql, and } from "void/db";

import { userTable } from "../../.void/better-auth-schema";

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

export function getWorkspaceRevision(userId: string, projectId: string) {
  const projectAvailable = availableProject(projectId);
  return db.get<{ revision: string | null }>(sql`SELECT (
    SELECT ${workspaces.revision} FROM ${workspaces} WHERE ${workspaceKey(userId, projectId)}
  ) AS revision WHERE ${projectAvailable}`);
}

export const WORKSPACE_PART_MAX_BYTES = 384 * 1024;

/** Split serialized workspace JSON into UTF-8 byte-bounded chunks without splitting surrogate pairs. */
export function splitWorkspaceContent(
  content: string,
  maxBytes = WORKSPACE_PART_MAX_BYTES,
): string[] {
  if (!Number.isInteger(maxBytes) || maxBytes < 4) {
    throw new RangeError("maxBytes must be an integer >= 4");
  }
  // Every UTF-16 code unit encodes to at most 3 UTF-8 bytes (surrogate pairs take 2 units -> 4 bytes).
  if (content.length * 3 <= maxBytes) return [content];
  const chunks: string[] = [];
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < content.length;) {
    const code = content.charCodeAt(i);
    let unitLen = 1;
    let byteLen = 3;
    if (code <= 0x7f) {
      byteLen = 1;
    } else if (code <= 0x7ff) {
      byteLen = 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < content.length) {
      const next = content.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        unitLen = 2;
        byteLen = 4;
      }
    }
    if (bytes + byteLen > maxBytes) {
      chunks.push(content.slice(start, i));
      start = i;
      bytes = byteLen;
    } else {
      bytes += byteLen;
    }
    i += unitLen;
  }
  chunks.push(content.slice(start));
  return chunks;
}

export async function saveWorkspace(
  userId: string,
  projectId: string,
  previous: string | null,
  draft: PersonalWorkspace,
  now = Date.now(),
) {
  const projectAvailable = sql`${availableProject(projectId)} AND EXISTS (
    SELECT 1 FROM ${userTable} WHERE ${userTable.id} = ${userId} AND ${userTable.deleted} = 0
  )`;
  const revision = crypto.randomUUID();
  const updatedAt = now;
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
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "conflict" } as const;
    if (!(await projectExists(projectId))) return { status: "missing" } as const;
    throw error;
  }
  return { status: "saved", revision, updatedAt } as const;
}
