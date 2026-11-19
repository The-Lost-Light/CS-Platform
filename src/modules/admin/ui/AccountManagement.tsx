import { useI18n } from "@modules/i18n";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";

import { useCreateAccount } from "../hooks/useCreateAccount";

export function AccountManagement({
  onCreated,
  onBack,
}: {
  onCreated: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const { pending, status, submit } = useCreateAccount(onCreated);
  return (
    <section className="ui-card overflow-hidden">
      <div className="ui-card-header flex items-center gap-3">
        <div className="ui-icon-badge w-9 h-9">
          <UserPlus aria-hidden="true" className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-on-primary-container">{t("admin.create")}</h2>
      </div>
      <div className="p-5 sm:p-6 space-y-5">
        <form onSubmit={submit} className="max-w-lg space-y-4">
          <label className="ui-field-label">
            {t("auth.accountLabel")}
            <input
              className="ui-input mt-1.5"
              name="email"
              type="email"
              autoComplete="off"
              required
            />
          </label>
          <label className="ui-field-label">
            {t("auth.nameLabel")}
            <input className="ui-input mt-1.5" name="name" required maxLength={100} />
          </label>
          <label className="ui-field-label">
            {t("auth.passwordLabel")}
            <input
              className="ui-input mt-1.5"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={MAX_PASSWORD_LENGTH}
              required
            />
          </label>
          <label className="ui-field-label">
            {t("auth.roleLabel")}
            <select className="ui-input mt-1.5" name="role">
              <option value="user">{t("auth.roles.student")}</option>
              <option value="admin">{t("admin.role")}</option>
            </select>
          </label>
          <p className="ui-field-help">
            {t("admin.passwordHelp", { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button type="submit" className="ui-btn-primary" disabled={pending}>
              {t(pending ? "common.loading" : "admin.create")}
            </button>
            <button type="button" className="ui-btn-text-muted" disabled={pending} onClick={onBack}>
              {t("admin.backToList")}
            </button>
          </div>
        </form>
        {status && (
          <div
            role="status"
            className={status === "success" ? "ui-banner-success" : "ui-banner-danger"}
          >
            <div className="flex items-center gap-2">
              {status === "success" ? (
                <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
              )}
              <span>{t(status === "success" ? "admin.success" : "admin.error")}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
