import { db, eq, sql, and } from "void/db";
import { workspaces, workspaceParts } from "@db/schema";
import { availableProject } from "@server/projects";
import { isUniqueViolation } from "@server/errors";
import type { PersonalWorkspace, WorkspaceSnapshot } from "@modules/workspace";

const workspaceKey = (userId: string, projectId: string) =>
  and(eq(workspaces.userId, userId), eq(workspaces.projectId, projectId));

export async function loadWorkspace(
  userId: string,
  projectId: string,
): Promise<WorkspaceSnapshot | null> {
  if (!(await db.get(sql`SELECT 1 WHERE ${availableProject(projectId)}`))) return null;
  const rows = await db
    .select({ revision: workspaces.revision, content: workspaceParts.content })
    .from(workspaces)
    .innerJoin(workspaceParts, eq(workspaces.revision, workspaceParts.revision))
    .where(workspaceKey(userId, projectId))
    .orderBy(workspaceParts.part);
  const draft: PersonalWorkspace | null = rows.length
    ? JSON.parse(rows.map((row) => row.content).join(""))
    : null;
  return { accountId: userId, revision: rows[0]?.revision ?? null, draft };
}

export function getWorkspaceRevision(userId: string, projectId: string) {
  const projectAvailable = availableProject(projectId);
  return db.get<{ revision: string | null }>(sql`SELECT (
    SELECT ${workspaces.revision} FROM ${workspaces} WHERE ${workspaceKey(userId, projectId)}
  ) AS revision WHERE ${projectAvailable}`);
}

export async function saveWorkspace(
  userId: string,
  projectId: string,
  previous: string | null,
  draft: PersonalWorkspace,
) {
  const projectAvailable = availableProject(projectId);
  const revision = crypto.randomUUID();
  const content = JSON.stringify(draft);
  const parts = [];
  for (let offset = 0; offset < content.length;) {
    let end = Math.min(content.length, offset + 384 * 1024);
    if (end < content.length && /[\uD800-\uDBFF]/.test(content[end - 1])) end--;
    parts.push({ revision, part: parts.length, content: content.slice(offset, end) });
    offset = end;
  }
  // Compare-and-swap and insert all parts in one transaction. A stale writer
  // collides with the current owner's unique key; its entire batch rolls back.
  try {
    await db.batch([
      db
        .delete(workspaces)
        .where(and(workspaceKey(userId, projectId), eq(workspaces.revision, previous ?? ""))),
      db
        .insert(workspaces)
        .select(sql`SELECT ${revision}, ${projectId}, ${userId} WHERE ${projectAvailable}`),
      db.insert(workspaceParts).values(parts),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "conflict" } as const;
    if (!(await db.get(sql`SELECT 1 WHERE ${projectAvailable}`)))
      return { status: "missing" } as const;
    throw error;
  }
  return { status: "saved", revision } as const;
}
