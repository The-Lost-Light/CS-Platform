import { allowsAdminMutation } from "@server/access";
import { accountEditHandler, deleteAccount } from "@server/accounts";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const PATCH = accountEditHandler("admin", "profile");

export const DELETE = defineHandler(async (c) => {
  const actor = requireAuth(c);
  if (!allowsAdminMutation(actor, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const result = await deleteAccount(actor.id, c.req.param("id") ?? "");
  if (result === "deleted") return { success: true };
  return c.json({ error: result }, result === "notFound" ? 404 : 409);
});
