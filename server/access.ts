export function isAdmin(user: object): boolean {
  return "role" in user && user.role === "admin";
}

export function allowsAdminMutation(user: object, request: Request): boolean {
  return isAdmin(user) && isSameOrigin(request);
}

export function isSameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}
