import { isRecord } from "@shared/isRecord";
import { db, desc, eq, and, sql } from "void/db";
import { userTable, sessionTable } from "../../.void/better-auth-schema";
import { isUniqueViolation } from "@server/errors";

// The predicate runs in the mutation statement, so concurrent administrators
// cannot remove each other's access based on an outdated role/count check.
const activeAdmin = (id: string) =>
  sql`EXISTS (SELECT 1 FROM user WHERE id = ${id} AND role = 'admin' AND COALESCE(banned, 0) = 0)`;
const anotherAdmin = (id: string) =>
  sql`EXISTS (SELECT 1 FROM user WHERE id != ${id} AND role = 'admin' AND COALESCE(banned, 0) = 0)`;

export function listAccounts() {
  return db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      banned: userTable.banned,
    })
    .from(userTable)
    .orderBy(desc(userTable.createdAt));
}

export async function updateAccount(actorId: string, id: string, body: unknown) {
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.length > 100 ||
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    !["user", "admin"].includes(String(body.role))
  )
    return "invalid";
  const role = String(body.role);
  if (id === actorId && role !== "admin") return "self";
  const [existing] = await db.select().from(userTable).where(eq(userTable.id, id)).limit(1);
  if (!existing) return "notFound";
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
            activeAdmin(actorId),
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
    if (!updated.length) return "protected";
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
  return "updated";
}

export async function deleteAccount(actorId: string, id: string) {
  if (id === actorId) return "self";
  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (!existing) return "notFound";
  const deleted = await db
    .delete(userTable)
    .where(and(eq(userTable.id, id), activeAdmin(actorId), anotherAdmin(id)))
    .returning({ id: userTable.id });
  if (!deleted.length) return "protected";
  return "deleted";
}
