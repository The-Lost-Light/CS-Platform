import { useI18n } from "@modules/i18n";
import type { ReactNode } from "react";

import { useAuth } from "../hooks/AuthProvider";
import type { AuthenticatedSession } from "../model/types";
import { LoginView } from "./LoginView";

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
