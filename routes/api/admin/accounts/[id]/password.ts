import { allowsAdminMutation } from "@server/access";
import { changeAccountPassword } from "@server/accounts";
import { defineHandler } from "void";
import { getAuth, requireAuth } from "void/auth";

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
  const { password } = await getAuth(c).$context;
  const result = await changeAccountPassword(actor.id, id, body, password);
  if (result === "updated") return { success: true, signedOut: id === actor.id };
  return c.json({ error: result }, result === "notFound" ? 404 : result === "conflict" ? 409 : 400);
});
