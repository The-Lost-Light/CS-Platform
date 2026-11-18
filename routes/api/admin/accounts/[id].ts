import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, eq, and, sql } from "void/db";
import { userTable, sessionTable } from "../../../../.void/better-auth-schema";
import { isUniqueViolation } from "../../../../server/errors";

// The predicate runs in the mutation statement, so concurrent administrators
// cannot remove each other's access based on an outdated role/count check.
const activeAdmin = (id: string) =>
  sql`EXISTS (SELECT 1 FROM user WHERE id = ${id} AND role = 'admin' AND COALESCE(banned, 0) = 0)`;
const anotherAdmin = (id: string) =>
  sql`EXISTS (SELECT 1 FROM user WHERE id != ${id} AND role = 'admin' AND COALESCE(banned, 0) = 0)`;

export const PATCH = defineHandler(async (c) => {
  const actor = requireAuth(c);
  if (
    !("role" in actor) ||
    actor.role !== "admin" ||
    c.req.header("origin") !== new URL(c.req.url).origin
  )
    return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id") ?? "";
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid" }, 400);
  }
  if (
    !body ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.length > 100 ||
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    !["user", "admin"].includes(String(body.role))
  )
    return c.json({ error: "invalid" }, 400);
  const role = String(body.role);
  if (id === actor.id && role !== "admin") return c.json({ error: "self" }, 409);
  const [existing] = await db.select().from(userTable).where(eq(userTable.id, id)).limit(1);
  if (!existing) return c.json({ error: "notFound" }, 404);
  const email = body.email.trim().toLowerCase();
  const now = new Date();
  try {
    const [updated] = await db.batch([
      db
        .update(userTable)
        .set({
          name: body.name.trim(),
          email,
          role,
          emailVerified: email === existing.email ? existing.emailVerified : false,
          updatedAt: now,
        })
        .where(
          and(
            eq(userTable.id, id),
            activeAdmin(actor.id),
            role === "admin" ? sql`1` : anotherAdmin(id),
          ),
        )
        .returning({ id: userTable.id }),
      db
        .delete(sessionTable)
        .where(
          and(
            eq(sessionTable.userId, id),
            sql`EXISTS (SELECT 1 FROM user WHERE id = ${id} AND updatedAt = ${now.getTime()})`,
          ),
        ),
    ]);
    if (!updated.length) return c.json({ error: "protected" }, 409);
  } catch (error) {
    if (isUniqueViolation(error)) return c.json({ error: "duplicate" }, 409);
    throw error;
  }
  return { success: true, signedOut: id === actor.id };
});

export const DELETE = defineHandler(async (c) => {
  const actor = requireAuth(c);
  if (
    !("role" in actor) ||
    actor.role !== "admin" ||
    c.req.header("origin") !== new URL(c.req.url).origin
  )
    return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id") ?? "";
  if (id === actor.id) return c.json({ error: "self" }, 409);
  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (!existing) return c.json({ error: "notFound" }, 404);
  const deleted = await db
    .delete(userTable)
    .where(and(eq(userTable.id, id), activeAdmin(actor.id), anotherAdmin(id)))
    .returning({ id: userTable.id });
  if (!deleted.length) return c.json({ error: "protected" }, 409);
  return { success: true };
});
