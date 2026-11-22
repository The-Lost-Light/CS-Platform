import { useI18n } from "@modules/i18n";
import { Button, FeedbackBanner, FormField, IconButton, TextInput } from "@shared/ui";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";

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

  const passwordToggleLabel = showPassword ? t("auth.hidePassword") : t("auth.showPassword");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
          {t("auth.title")}
        </h2>
        <p className="text-xs sm:text-sm text-on-muted mt-1">{t("auth.description")}</p>
      </div>

      {errorMessage && (
        <FeedbackBanner kind="error">
          <span>{t(errorMessage)}</span>
        </FeedbackBanner>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t("auth.accountLabel")}>
          <TextInput
            icon={User}
            type="email"
            autoComplete="username"
            required
            value={credentials.studentId}
            onChange={(e) => updateField("studentId", e.target.value)}
            placeholder={t("auth.accountPlaceholder")}
            className="pr-3.5 font-medium"
          />
        </FormField>

        <FormField label={t("auth.passwordLabel")}>
          <TextInput
            icon={Lock}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={credentials.password}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder={t("auth.passwordPlaceholder")}
            className="font-medium"
            trailing={
              <IconButton
                icon={showPassword ? EyeOff : Eye}
                label={passwordToggleLabel}
                withTitle
                onClick={togglePassword}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              />
            }
          />
        </FormField>

        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            trailingIcon={ArrowRight}
            className="w-full"
          >
            <span>{t(pending ? "common.loading" : "auth.submit")}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
