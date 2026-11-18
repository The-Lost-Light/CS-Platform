import { useAuth } from "@auth/AuthProvider";
import type { AuthenticatedSession } from "@auth/types";
import { LoginView } from "@pages/auth/LoginView";
import { useI18n } from "@i18n";
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: (session: AuthenticatedSession) => ReactNode }) {
  const { currentUser, login, logout, loading, sessionError } = useAuth();

  const { t } = useI18n();
  if (loading) return <p role="status">{t("common.loading")}</p>;
  if (sessionError)
    return (
      <div role="alert">
        {t("auth.errors.unavailable")}{" "}
        <button onClick={() => window.location.reload()}>{t("auth.retry")}</button>
      </div>
    );
  return currentUser ? children({ currentUser, logout }) : <LoginView onLogin={login} />;
}
