import { defineHandler, type CloudContext } from "void";
import { requireAuth } from "void/auth";

export function isDeletedUser(user: object): boolean {
  return "deleted" in user && Boolean(user.deleted);
}

export function isAdmin(user: object): boolean {
  return !isDeletedUser(user) && "role" in user && user.role === "admin";
}

export function allowsAdminMutation(user: object, request: Request): boolean {
  return isAdmin(user) && isSameOrigin(request);
}

export function isSameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export function defineAdminHandler<R>(
  handler: (c: CloudContext, user: ReturnType<typeof requireAuth>) => R,
) {
  return defineHandler((c) => {
    const user = requireAuth(c);
    if (!isAdmin(user)) return c.json({ error: "forbidden" }, 403);
    return handler(c, user);
  });
}

export function defineAdminMutationHandler<R>(
  handler: (c: CloudContext, user: ReturnType<typeof requireAuth>) => R,
) {
  return defineHandler((c) => {
    const user = requireAuth(c);
    if (!allowsAdminMutation(user, c.req.raw)) return c.json({ error: "forbidden" }, 403);
    return handler(c, user);
  });
}
