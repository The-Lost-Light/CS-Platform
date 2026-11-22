import { isAdmin } from "@server/access";
import {
  getWorkspaceRevision,
  listStudentWorkspaces,
  loadWorkspace,
  readWorkspaceInput,
  saveWorkspace,
} from "@server/workspaces";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const projectId = c.req.param("id") ?? "";
  c.header("Cache-Control", "private, no-store");
  if (c.req.query("list") === "students") {
    if (!isAdmin(user)) return c.json({ error: "forbidden" }, 403);
    const students = await listStudentWorkspaces(projectId);
    return students ? c.json({ students }) : c.notFound();
  }
  const targetUserId = c.req.query("userId");
  if (targetUserId && targetUserId !== user.id) {
    if (!isAdmin(user)) return c.json({ error: "forbidden" }, 403);
    const snapshot = await loadWorkspace(targetUserId, projectId, true);
    return snapshot ? c.json(snapshot) : c.notFound();
  }
  const snapshot = await loadWorkspace(user.id, projectId);
  return snapshot ? c.json(snapshot) : c.notFound();
});

export const PUT = defineHandler(async (c) => {
  const { id: userId } = requireAuth(c);
  const projectId = c.req.param("id") ?? "";
  if (
    c.req.header("Origin") !== new URL(c.req.url).origin ||
    c.req.header("X-Workspace-Account") !== userId
  )
    return c.json({ error: "session" }, 403);
  const stored = await getWorkspaceRevision(userId, projectId);
  if (!stored) return c.notFound();
  const input = await readWorkspaceInput(c.req.raw);
  if (!input.ok) return c.json({ error: input.error }, input.error === "tooLarge" ? 413 : 400);
  if (input.previous !== stored.revision) return c.json({ error: "conflict" }, 409);
  const result = await saveWorkspace(userId, projectId, input.previous, input.draft);
  if (result.status === "conflict") return c.json({ error: "conflict" }, 409);
  if (result.status === "missing") return c.notFound();
  return c.json({ revision: result.revision });
});
