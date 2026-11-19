import { useI18n } from "@modules/i18n";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";

import { useLoginForm, type LoginHandler } from "../hooks/useLoginForm";

export function LoginForm({ onLogin }: { onLogin: LoginHandler }) {
  const { t } = useI18n();
  const {
    credentials,
    updateField,
    showPassword,
    togglePassword,
    errorMessage,
    handleSubmit,
    pending,
  } = useLoginForm(onLogin);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
          {t("auth.title")}
        </h2>
        <p className="text-xs sm:text-sm text-on-muted mt-1">{t("auth.description")}</p>
      </div>

      {errorMessage && (
        <div role="alert" className="ui-banner-danger">
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>{t(errorMessage)}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="ui-field-label mb-1.5">{t("auth.accountLabel")}</label>
          <div className="relative">
            <User
              aria-hidden="true"
              className="w-4 h-4 text-on-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="email"
              autoComplete="username"
              required
              value={credentials.studentId}
              onChange={(e) => updateField("studentId", e.target.value)}
              placeholder={t("auth.accountPlaceholder")}
              className="ui-input pl-10 pr-3.5 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="ui-field-label mb-1.5">{t("auth.passwordLabel")}</label>
          <div className="relative">
            <Lock
              aria-hidden="true"
              className="w-4 h-4 text-on-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={credentials.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              className="ui-input pl-10 pr-11 font-medium"
            />
            <button
              type="button"
              onClick={togglePassword}
              className="ui-btn-icon w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2"
              title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="w-4 h-4" />
              ) : (
                <Eye aria-hidden="true" className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={pending} className="ui-btn-primary w-full py-3 text-sm">
            <span>{t(pending ? "common.loading" : "auth.submit")}</span>
            <ArrowRight aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
