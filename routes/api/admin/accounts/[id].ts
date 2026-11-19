import { allowsAdminMutation } from "@server/access";
import { updateAccount, deleteAccount } from "@server/accounts";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const PATCH = defineHandler(async (c) => {
  const actor = requireAuth(c);
  if (!allowsAdminMutation(actor, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id") ?? "";
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid" }, 400);
  }
  const result = await updateAccount(actor.id, id, body);
  if (result === "updated") return { success: true, signedOut: id === actor.id };
  return c.json({ error: result }, result === "invalid" ? 400 : result === "notFound" ? 404 : 409);
});

export const DELETE = defineHandler(async (c) => {
  const actor = requireAuth(c);
  if (!allowsAdminMutation(actor, c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const result = await deleteAccount(actor.id, c.req.param("id") ?? "");
  if (result === "deleted") return { success: true };
  return c.json({ error: result }, result === "notFound" ? 404 : 409);
});
