import { isRecord } from "@shared/isRecord";
import { isValidPasswordLength, MAX_CURRENT_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { db, desc, eq, and, exists, sql } from "void/db";
import { userTable, sessionTable, accountTable } from "../../.void/better-auth-schema";
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

interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(input: { password: string; hash: string }): Promise<boolean>;
}

export async function updateAccount(actorId: string, id: string, body: unknown) {
  if (
    !isRecord(body) ||
    "password" in body ||
    "currentPassword" in body ||
    "newPassword" in body ||
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
  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (!existing) return "notFound";
  const email = body.email.trim().toLowerCase();
  const now = new Date();
  const editableUser = and(
    eq(userTable.id, id),
    activeAdmin(actorId),
    role === "admin" ? undefined : anotherAdmin(id),
  );
  const canEdit = exists(db.select({ id: userTable.id }).from(userTable).where(editableUser));
  try {
    const [updated] = await db.batch([
      db
        .update(userTable)
        .set({
          name: body.name.trim(),
          email,
          role,
          emailVerified: sql`CASE WHEN ${userTable.email} = ${email} THEN ${userTable.emailVerified} ELSE 0 END`,
          updatedAt: now,
        })
        .where(editableUser)
        .returning({ id: userTable.id }),
      db.delete(sessionTable).where(and(eq(sessionTable.userId, id), canEdit)),
    ]);
    if (!updated.length) return "protected";
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
  return "updated";
}

export async function changeAccountPassword(
  actorId: string,
  id: string,
  body: unknown,
  hasher: PasswordHasher,
) {
  if (
    !isRecord(body) ||
    Object.keys(body).some((key) => key !== "currentPassword" && key !== "newPassword") ||
    !isValidPasswordLength(body.newPassword)
  )
    return "invalid";
  const { currentPassword, newPassword } = body;
  if (
    typeof currentPassword !== "string" ||
    !currentPassword ||
    currentPassword.length > MAX_CURRENT_PASSWORD_LENGTH
  )
    return "invalidCurrentPassword";
  const [target] = await db
    .select({ credentialId: accountTable.id, hash: accountTable.password })
    .from(userTable)
    .leftJoin(
      accountTable,
      and(eq(accountTable.userId, userTable.id), eq(accountTable.providerId, "credential")),
    )
    .where(eq(userTable.id, id))
    .limit(1);
  if (!target) return "notFound";
  if (
    !target.credentialId ||
    !target.hash ||
    !(await hasher.verify({ password: currentPassword, hash: target.hash }))
  )
    return "invalidCurrentPassword";
  const newHash = await hasher.hash(newPassword);
  const verifiedCredential = and(
    eq(accountTable.id, target.credentialId),
    eq(accountTable.password, target.hash),
    activeAdmin(actorId),
  );
  // Recheck the verified hash in both statements. Only one concurrent change can succeed.
  const [, updated] = await db.batch([
    db
      .delete(sessionTable)
      .where(
        and(
          eq(sessionTable.userId, id),
          exists(db.select({ id: accountTable.id }).from(accountTable).where(verifiedCredential)),
        ),
      ),
    db
      .update(accountTable)
      .set({ password: newHash, updatedAt: new Date() })
      .where(verifiedCredential)
      .returning({ id: accountTable.id }),
  ]);
  return updated.length ? "updated" : "conflict";
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
