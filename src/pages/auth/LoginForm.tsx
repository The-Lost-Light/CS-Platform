import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { useI18n } from "@i18n";
import { DemoAccountPicker } from "@pages/auth/DemoAccountPicker";
import { useLoginForm, type LoginHandler } from "@auth/useLoginForm";

export function LoginForm({ onLogin }: { onLogin: LoginHandler }) {
  const { t } = useI18n();
  const {
    credentials,
    updateField,
    showPassword,
    togglePassword,
    errorMessage,
    handleSubmit,
    selectDemoAccount,
  } = useLoginForm(onLogin);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
          {t("auth.title")}
        </h2>
        <p className="text-xs sm:text-sm text-on-muted mt-1">
          {t("auth.description")}
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-danger-container border border-danger-outline text-on-danger-container text-xs font-medium">
          {t(errorMessage)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-on-muted mb-1.5">
              {t("auth.accountLabel")}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-on-subtle absolute left-3.5 top-3" />
              <input
                type="text"
                value={credentials.studentId}
                onChange={(e) => updateField("studentId", e.target.value)}
                placeholder={t("auth.accountPlaceholder")}
                className="ui-input pl-10 pr-3.5 py-2.5 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-muted mb-1.5">
              {t("auth.nameLabel")}
            </label>
            <input
              type="text"
              value={credentials.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={t("auth.namePlaceholder")}
              className="ui-input px-3.5 py-2.5 text-sm font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-on-muted mb-1.5">
              {t("auth.passwordLabel")}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-on-subtle absolute left-3.5 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                className="ui-input pl-10 pr-10 py-2.5 text-sm font-medium"
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-3 top-2.5 text-on-subtle hover:text-on-surface transition"
                title={
                  showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-muted mb-1.5">
              {t("auth.roleLabel")}
            </label>
            <select
              value={credentials.role}
              onChange={(e) => updateField("role", e.target.value)}
              className="ui-input px-3.5 py-2.5 text-sm font-medium"
            >
              <option value="學生 (Student)">{t("auth.roles.student")}</option>
              <option value="專題組長 (Team Lead)">
                {t("auth.roles.teamLead")}
              </option>
              <option value="課程助教 (TA)">{t("auth.roles.ta")}</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 px-6 rounded-full bg-secondary hover:bg-secondary-hover text-on-secondary font-semibold text-sm shadow-xs hover:shadow-md flex items-center justify-center gap-2 transition"
          >
            <span>{t("auth.submit")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      <DemoAccountPicker
        selectedAccount={credentials.studentId}
        onSelect={selectDemoAccount}
      />
    </div>
  );
}
