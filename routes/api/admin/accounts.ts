import { isAdmin } from "@server/access";
import { listAccounts } from "@server/accounts";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  if (!isAdmin(user)) return c.json({ error: "forbidden" }, 403);
  return { users: await listAccounts(), currentUserId: user.id };
});
