import { defineAdminMutationHandler } from "@server/access";
import { accountEditHandler, deleteAccount } from "@server/accounts";

export const PATCH = accountEditHandler("admin", "profile");

export const DELETE = defineAdminMutationHandler(async (c, actor) => {
  const result = await deleteAccount(actor.id, c.req.param("id") ?? "");
  if (result === "deleted") return { success: true };
  return c.json({ error: result }, result === "notFound" ? 404 : 409);
});
