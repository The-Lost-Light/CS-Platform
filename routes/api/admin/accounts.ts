import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { db, desc } from "void/db";
import { userTable } from "../../../.void/better-auth-schema";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!("role" in user) || user.role !== "admin") return c.json({ error: "forbidden" }, 403);
  const users = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      banned: userTable.banned,
    })
    .from(userTable)
    .orderBy(desc(userTable.createdAt));
  return { users, currentUserId: user.id };
});
