import { allowsAdminMutation, isDeletedUser } from "@server/access";
import { listCatalog, readProjectInput, reorderProjects, saveProject } from "@server/projects";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

const MAX_REORDER_BODY_BYTES = 64 * 1024;

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (isDeletedUser(user)) return c.json({ error: "unauthorized" }, 401);
  c.header("Cache-Control", "private, no-store");
  return await listCatalog(user.id);
});

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!allowsAdminMutation(user, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const parsed = await readProjectInput(c.req.raw);
  if (!parsed) return c.json({ error: "invalid" }, 400);
  const project = await saveProject(parsed, user.id);
  if (!project) return c.json({ error: "failed" }, 500);
  return c.json({ project }, 201);
});

export const PUT = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!allowsAdminMutation(user, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!c.req.raw.body || Number(c.req.header("Content-Length")) > MAX_REORDER_BODY_BYTES) {
    return c.json({ error: "invalid" }, 400);
  }
  let body: unknown;
  try {
    let bytes = 0;
    const bounded = c.req.raw.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          bytes += chunk.byteLength;
          if (bytes > MAX_REORDER_BODY_BYTES) throw new Error("Reorder payload too large");
          controller.enqueue(chunk);
        },
      }),
    );
    body = await new Response(bounded, { headers: c.req.raw.headers }).json();
  } catch {
    return c.json({ error: "invalid" }, 400);
  }
  const result = await reorderProjects(body);
  if (result === "invalid") return c.json({ error: "invalid" }, 400);
  if (result === "conflict") return c.json({ error: "conflict" }, 409);
  return { projects: result };
});
