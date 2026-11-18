import { isAdmin } from "@server/access";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const ssr = false;
export const loader = defineHandler((c) => {
  const user = requireAuth(c, { throwRedirect: "/" });
  if (!isAdmin(user)) return c.text("Forbidden", 403);
  return {};
});
