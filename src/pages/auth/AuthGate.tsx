import type { ReactNode } from "react";
import { LoginView } from "@pages/auth/LoginView";
import { useAuth } from "@auth/AuthProvider";
import type { AuthenticatedSession } from "@auth/types";

export function AuthGate({
  children,
}: {
  children: (session: AuthenticatedSession) => ReactNode;
}) {
  const { currentUser, login, logout } = useAuth();

  // Unmount authenticated content on logout so a new session starts at home.
  return currentUser ? (
    children({ currentUser, logout })
  ) : (
    <LoginView onLogin={login} />
  );
}
