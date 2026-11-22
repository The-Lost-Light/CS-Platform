import { useI18n } from "@modules/i18n";
import { Button, Card, FeedbackBanner, LoadingPanel } from "@shared/ui";
import type { ReactNode } from "react";

import { useAuth } from "../hooks/AuthProvider";
import { LoginView } from "./LoginView";

export function AuthGate({ children }: { children: ReactNode }) {
  const { currentUser, login, loading, sessionError } = useAuth();

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
        <Card as="div" className="w-full max-w-md p-6 space-y-4">
          <FeedbackBanner kind="error">
            <span>{t("auth.errors.unavailable")}</span>
          </FeedbackBanner>
          <Button className="w-full" onClick={() => window.location.reload()}>
            {t("auth.retry")}
          </Button>
        </Card>
      </div>
    );
  return currentUser ? children : <LoginView onLogin={login} />;
}
