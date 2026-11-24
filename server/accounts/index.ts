import { isAdmin, isSameOrigin } from "@server/access";
import { defineHandler } from "void";
import { getAuth, requireAuth } from "void/auth";

import { changeAccountPassword, updateAccount, type AccountTarget } from "./store";

export { changeAccountPassword, deleteAccount, listAccounts, type AccountTarget } from "./store";

export function accountEditHandler(
  scope: AccountTarget["scope"],
  operation: "profile" | "password",
) {
  return defineHandler(async (c) => {
    const actor = requireAuth(c);
    if (!isSameOrigin(c.req.raw) || (scope === "admin" && !isAdmin(actor)))
      return c.json({ error: "forbidden" }, 403);
    const target: AccountTarget =
      scope === "self"
        ? { scope, id: actor.id }
        : { scope, id: c.req.param("id") ?? "", actorId: actor.id };
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid" }, 400);
    }
    const result =
      operation === "profile"
        ? await updateAccount(target, body)
        : await changeAccountPassword(target, body, (await getAuth(c).$context).password);
    if (result === "updated") return { success: true, signedOut: target.id === actor.id };
    return c.json(
      { error: result },
      result === "notFound"
        ? 404
        : result === "invalid" || result === "invalidCurrentPassword"
          ? 400
          : 409,
    );
  });
}
