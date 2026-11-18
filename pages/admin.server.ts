import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const ssr = false;
export const loader = defineHandler((c) => {
  const user = requireAuth(c, { throwRedirect: "/" });
  if (!("role" in user) || user.role !== "admin") return c.text("Forbidden", 403);
  return {};
});
