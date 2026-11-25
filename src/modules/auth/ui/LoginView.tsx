import { useI18n } from "@modules/i18n";
import { Card } from "@shared/ui";
import { Code2 } from "lucide-react";

import type { LoginHandler } from "../hooks/useLoginForm";
import { LoginForm } from "./LoginForm";

export function LoginView({ onLogin }: { onLogin: LoginHandler }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-canvas text-on-surface flex items-center justify-center p-4 sm:p-6 relative transition-colors">
      <Card
        as="div"
        overflowHidden
        className="shadow-m3-2 w-full max-w-4xl grid grid-cols-1 md:grid-cols-12"
      >
        <div className="md:col-span-5 relative overflow-hidden bg-brand-banner text-on-brand-banner p-8 flex flex-col justify-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand-banner-accent/55 blur-2xl"
          />
          <div className="relative space-y-5">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-m3-1">
              <Code2 aria-hidden="true" className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                {t("app.title")}
              </h1>
              <p className="text-sm text-on-brand-banner-muted leading-relaxed">
                {t("auth.intro")}
              </p>
            </div>
          </div>
        </div>
        <div className="md:col-span-7 p-7 sm:p-10 flex flex-col justify-center bg-surface">
          <LoginForm onLogin={onLogin} />
        </div>
      </Card>
    </div>
  );
}
