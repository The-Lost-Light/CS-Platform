import { isAdmin } from "@server/access";
import {
  latestDesignVersion,
  readDesignVersion,
  studentHistoryAvailable,
} from "@server/workspaces";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  c.header("Cache-Control", "private, no-store");
  if (!isAdmin(user)) return c.json({ error: "forbidden" }, 403);
  const projectId = c.req.param("id") ?? "";
  const accountId = c.req.query("userId");
  if (!accountId) return c.json({ error: "invalid" }, 400);
  if (!(await studentHistoryAvailable(accountId, projectId))) return c.notFound();
  const requested = c.req.query("version");
  if (requested === undefined)
    return c.json({ total: await latestDesignVersion(accountId, projectId) });
  const version = Number(requested);
  if (!/^[1-9]\d*$/.test(requested) || !Number.isSafeInteger(version))
    return c.json({ error: "invalid" }, 400);
  const content = await readDesignVersion(accountId, projectId, version);
  return content ? c.json(content) : c.notFound();
});
