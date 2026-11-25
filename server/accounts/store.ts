import { isUniqueViolation } from "@server/errors";
import {
  isAccountRole,
  normalizeAccountEmail,
  normalizeAccountName,
  type AccountRole,
} from "@shared/accountPolicy";
import { isRecord } from "@shared/isRecord";
import { isValidPasswordLength } from "@shared/passwordPolicy";
import { db, desc, eq, and, exists, sql } from "void/db";

import { userTable, sessionTable, accountTable } from "../../.void/better-auth-schema";

// The predicate runs in the mutation statement, so concurrent administrators
// cannot remove each other's access based on an outdated role/count check.
const activeAdmin = (id: string) =>
  sql`EXISTS (SELECT 1 FROM user WHERE id = ${id} AND deleted = 0 AND role = 'admin' AND COALESCE(banned, 0) = 0)`;
const anotherAdmin = (id: string) =>
  sql`EXISTS (SELECT 1 FROM user WHERE id != ${id} AND deleted = 0 AND role = 'admin' AND COALESCE(banned, 0) = 0)`;
const studentAccount = (id: string) =>
  sql`EXISTS (SELECT 1 FROM user WHERE id = ${id} AND deleted = 0 AND COALESCE(role, 'user') != 'admin')`;
const activeTargetUser = (id: string) =>
  sql`EXISTS (SELECT 1 FROM user WHERE id = ${id} AND deleted = 0)`;

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
    .where(eq(userTable.deleted, false))
    .orderBy(desc(userTable.createdAt));
}

interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(input: { password: string; hash: string }): Promise<boolean>;
}

export type AccountTarget =
  | { scope: "self"; id: string }
  | { scope: "admin"; id: string; actorId: string };

function activeActor(target: AccountTarget) {
  return target.scope === "admin"
    ? activeAdmin(target.actorId)
    : sql`EXISTS (SELECT 1 FROM user WHERE id = ${target.id} AND deleted = 0 AND COALESCE(banned, 0) = 0)`;
}

async function accountExists(id: string) {
  const [row] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.id, id), eq(userTable.deleted, false)))
    .limit(1);
  return Boolean(row);
}

export async function updateAccount(target: AccountTarget, body: unknown) {
  const { id } = target;
  if (
    !isRecord(body) ||
    Object.keys(body).some(
      (key) => key !== "name" && key !== "email" && !(key === "role" && target.scope === "admin"),
    )
  )
    return "invalid";
  const name = normalizeAccountName(body.name);
  const email = normalizeAccountEmail(body.email);
  if (!name || !email) return "invalid";
  let role: AccountRole | undefined;
  if (target.scope === "admin") {
    if (!isAccountRole(body.role)) return "invalid";
    role = body.role;
    if (id === target.actorId && role !== "admin") return "self";
  }
  if (!(await accountExists(id))) return "notFound";
  const now = new Date();
  const editableUser = and(
    eq(userTable.id, id),
    eq(userTable.deleted, false),
    activeActor(target),
    role === "user" ? anotherAdmin(id) : undefined,
  );
  const canEdit = exists(db.select({ id: userTable.id }).from(userTable).where(editableUser));
  try {
    const [updated] = await db.batch([
      db
        .update(userTable)
        .set({
          name,
          email,
          ...(role ? { role } : {}),
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
  targetAccount: AccountTarget,
  body: unknown,
  hasher: PasswordHasher,
) {
  const { id } = targetAccount;
  if (
    !isRecord(body) ||
    Object.keys(body).some((key) => key !== "currentPassword" && key !== "newPassword") ||
    !isValidPasswordLength(body.newPassword)
  )
    return "invalid";
  const { currentPassword, newPassword } = body;
  const [target] = await db
    .select({
      role: userTable.role,
      credentialId: accountTable.id,
      hash: accountTable.password,
    })
    .from(userTable)
    .leftJoin(
      accountTable,
      and(eq(accountTable.userId, userTable.id), eq(accountTable.providerId, "credential")),
    )
    .where(and(eq(userTable.id, id), eq(userTable.deleted, false)))
    .limit(1);
  if (!target) return "notFound";
  const isAdminResettingStudent =
    targetAccount.scope === "admin" && id !== targetAccount.actorId && target.role !== "admin";
  const requiresCurrentPassword = !isAdminResettingStudent;
  if (requiresCurrentPassword) {
    if (!isValidPasswordLength(currentPassword)) return "invalidCurrentPassword";
    if (
      !target.credentialId ||
      !target.hash ||
      !(await hasher.verify({ password: currentPassword, hash: target.hash }))
    )
      return "invalidCurrentPassword";
  } else if (currentPassword !== undefined) {
    return "invalid";
  }
  if (!target.credentialId || !target.hash) return "conflict";
  const newHash = await hasher.hash(newPassword);
  const verifiedCredential = and(
    eq(accountTable.id, target.credentialId),
    eq(accountTable.password, target.hash),
    activeActor(targetAccount),
    isAdminResettingStudent ? studentAccount(id) : activeTargetUser(id),
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
  if (!(await accountExists(id))) return "notFound";
  const deletableUser = and(
    eq(userTable.id, id),
    eq(userTable.deleted, false),
    activeAdmin(actorId),
    anotherAdmin(id),
  );
  const canDelete = exists(db.select({ id: userTable.id }).from(userTable).where(deletableUser));
  // Revoke sessions before setting deleted=true so canDelete evaluates against the active row.
  const [, updated] = await db.batch([
    db.delete(sessionTable).where(and(eq(sessionTable.userId, id), canDelete)),
    db
      .update(userTable)
      .set({ deleted: true, updatedAt: new Date() })
      .where(deletableUser)
      .returning({ id: userTable.id }),
  ]);
  if (!updated.length) return "protected";
  return "deleted";
}
