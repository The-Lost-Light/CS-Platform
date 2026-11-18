export function isAdmin(user: object): boolean {
  return "role" in user && user.role === "admin";
}

export function allowsAdminMutation(user: object, request: Request): boolean {
  return isAdmin(user) && request.headers.get("origin") === new URL(request.url).origin;
}
