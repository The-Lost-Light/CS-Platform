import { defineAdminHandler } from "@server/access";
import { listAccounts } from "@server/accounts";

export const GET = defineAdminHandler(async (_c, user) => ({
  users: await listAccounts(),
  currentUserId: user.id,
}));
