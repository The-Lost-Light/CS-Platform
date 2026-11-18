import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { and, eq, db, sql } from "void/db";
import { projects, removedProjects, workspaces, workspaceParts } from "../../../../db/schema";
import { isUniqueViolation } from "../../../../server/errors";
import { PROJECTS } from "@data/projectsData";
import { C4_FILE_MAX_BYTES, validateC4File } from "@domain/c4File";
import type { PersonalWorkspace } from "@domain/personalWorkspace";

const maxBytes = C4_FILE_MAX_BYTES + 1024 * 1024;
const workspaceKey = (userId: string, projectId: string) =>
  and(eq(workspaces.userId, userId), eq(workspaces.projectId, projectId));
function availableProject(id: string) {
  const builtIn = PROJECTS.some((project) => project.id === id);
  return sql`NOT EXISTS (SELECT 1 FROM ${removedProjects} WHERE ${removedProjects.id} = ${id})
    AND (${Number(builtIn)} OR EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${id}))`;
}

async function readBody(request: Request) {
  if (Number(request.headers.get("Content-Length")) > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    return chunks.join("") + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export const GET = defineHandler(async (c) => {
  const { id: userId } = requireAuth(c);
  const projectId = c.req.param("id") ?? "";
  c.header("Cache-Control", "private, no-store");
  if (!(await db.get(sql`SELECT 1 WHERE ${availableProject(projectId)}`))) return c.notFound();
  const rows = await db
    .select({ revision: workspaces.revision, content: workspaceParts.content })
    .from(workspaces)
    .innerJoin(workspaceParts, eq(workspaces.revision, workspaceParts.revision))
    .where(workspaceKey(userId, projectId))
    .orderBy(workspaceParts.part);
  const draft: PersonalWorkspace | null = rows.length
    ? JSON.parse(rows.map((row) => row.content).join(""))
    : null;
  return c.json({ accountId: userId, revision: rows[0]?.revision ?? null, draft });
});

export const PUT = defineHandler(async (c) => {
  const { id: userId } = requireAuth(c);
  const projectId = c.req.param("id") ?? "";
  if (
    c.req.header("Origin") !== new URL(c.req.url).origin ||
    c.req.header("X-Workspace-Account") !== userId
  )
    return c.json({ error: "session" }, 403);
  const projectAvailable = availableProject(projectId);
  const stored = await db.get<{ revision: string | null }>(sql`SELECT (
    SELECT ${workspaces.revision} FROM ${workspaces} WHERE ${workspaceKey(userId, projectId)}
  ) AS revision WHERE ${projectAvailable}`);
  if (!stored) return c.notFound();
  const bodyText = await readBody(c.req.raw);
  if (bodyText === null) return c.json({ error: "tooLarge" }, 413);
  let draft: PersonalWorkspace;
  let previous: string | null;
  try {
    const body = JSON.parse(bodyText);
    previous = body.revision;
    if (previous !== null && (typeof previous !== "string" || previous.length !== 36))
      throw new Error();
    const { designDoc, repoUrl, model } = body.draft;
    if (typeof designDoc !== "string" || typeof repoUrl !== "string") throw new Error();
    // Accept the URL and owner/repository formats used by the GitHub panel.
    if (
      repoUrl &&
      (repoUrl.length > 300 ||
        !/^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/)?[\w.-]+\/[\w.-]+\/?$/i.test(repoUrl.trim()))
    )
      return c.json({ error: "repo" }, 400);
    draft = { designDoc, repoUrl: repoUrl.trim(), model: validateC4File(model) };
  } catch {
    return c.json({ error: "invalid" }, 400);
  }
  if (previous !== stored.revision) return c.json({ error: "conflict" }, 409);

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
    if (isUniqueViolation(error)) return c.json({ error: "conflict" }, 409);
    if (!(await db.get(sql`SELECT 1 WHERE ${projectAvailable}`))) return c.notFound();
    throw error;
  }
  return c.json({ revision });
});
