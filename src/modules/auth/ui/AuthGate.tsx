import { useI18n } from "@modules/i18n";
import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { useAuth } from "../hooks/AuthProvider";
import type { AuthenticatedSession } from "../model/types";
import { LoginView } from "./LoginView";

export function AuthGate({ children }: { children: (session: AuthenticatedSession) => ReactNode }) {
  const { currentUser, login, logout, loading, sessionError } = useAuth();

  const { t } = useI18n();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <LoadingPanel label={t("common.loading")} />
      </div>
    );
  if (sessionError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="ui-card w-full max-w-md p-6 space-y-4">
          <div className="ui-banner-danger" role="alert">
            <div className="flex items-center gap-2.5">
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
              <span>{t("auth.errors.unavailable")}</span>
            </div>
          </div>
          <button
            type="button"
            className="ui-btn-primary w-full"
            onClick={() => window.location.reload()}
          >
            {t("auth.retry")}
          </button>
        </div>
      </div>
    );
  return currentUser ? children({ currentUser, logout }) : <LoginView onLogin={login} />;
}
