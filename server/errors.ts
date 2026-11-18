export function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 8 && current; depth++) {
    const message =
      current instanceof Error ? current.message : typeof current === "string" ? current : "";
    if (message.includes("UNIQUE constraint failed")) return true;
    current = current instanceof Error ? current.cause : null;
  }
  return false;
}
