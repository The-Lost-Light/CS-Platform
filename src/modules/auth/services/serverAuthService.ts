import type { AuthService, User } from "../model/types";
export async function loadSession(): Promise<User | null> {
  const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Session unavailable");
  const data = (await response.json()) as { user: User | null };
  return data.user;
}
export const serverAuthService: AuthService = {
  async login(credentials) {
    if (!credentials.studentId.trim()) return { ok: false, error: "accountRequired" };
    if (!credentials.password.trim()) return { ok: false, error: "passwordRequired" };
    try {
      const { auth } = await import("void/client");
      const result = await auth.signIn.email({
        email: credentials.studentId.trim(),
        password: credentials.password,
      });
      if (result.error) return { ok: false, error: "invalidCredentials" };
      const user = await loadSession();
      return user ? { ok: true, user } : { ok: false, error: "invalidCredentials" };
    } catch {
      return { ok: false, error: "unavailable" };
    }
  },
};
export async function signOut() {
  const { auth } = await import("void/client");
  const result = await auth.signOut();
  if (result.error) throw new Error("Sign out failed");
}
