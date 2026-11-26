import { isProjectOverdue } from "@modules/projects";
import { isAdmin, isSameOrigin } from "@server/access";
import { getProjectDeadline } from "@server/projects";
import {
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
  const accountId = targetUserId || user.id;
  const forStudent = accountId !== user.id;
  if (forStudent && !isAdmin(user)) return c.json({ error: "forbidden" }, 403);
  const snapshot = await loadWorkspace(accountId, projectId, forStudent);
  return snapshot ? c.json(snapshot) : c.notFound();
});

export const PUT = defineHandler(async (c) => {
  const user = requireAuth(c);
  const { id: userId } = user;
  const projectId = c.req.param("id") ?? "";
  if (!isSameOrigin(c.req.raw) || c.req.header("X-Workspace-Account") !== userId)
    return c.json({ error: "session" }, 403);
  const deadline = await getProjectDeadline(projectId);
  if (!deadline) return c.notFound();
  if (!isAdmin(user) && isProjectOverdue(deadline.dueDate))
    return c.json({ error: "deadlinePassed" }, 403);
  const input = await readWorkspaceInput(c.req.raw);
  if (!input.ok) return c.json({ error: input.error }, input.error === "tooLarge" ? 413 : 400);
  const stored = await loadWorkspace(userId, projectId);
  if (!stored) return c.notFound();
  // Bind retries to their original parent so an old request cannot become a new head.
  let revision: string = crypto.randomUUID();
  if (input.writeId) {
    const seed = JSON.stringify([projectId, userId, input.previous, input.writeId]);
    const bytes = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)),
    );
    bytes[6] = (bytes[6] & 0x0f) | 0x80;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
    revision = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
    if (stored.revision === revision) return c.json({ revision, updatedAt: stored.updatedAt });
  }
  if (input.previous !== stored.revision) return c.json({ error: "conflict" }, 409);
  const result = await saveWorkspace(
    userId,
    projectId,
    input.previous,
    input.draft,
    stored.draft,
    input.edits,
    revision,
  );
  if (result.status === "conflict") return c.json({ error: "conflict" }, 409);
  if (result.status === "missing") return c.notFound();
  return c.json({ revision: result.revision, updatedAt: result.updatedAt });
});
