import { useI18n } from "@modules/i18n";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@shared/passwordPolicy";

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
    <section className="ui-card p-6 space-y-4">
      <h2 className="text-xl font-bold">{t("admin.create")}</h2>
      <form onSubmit={submit} className="max-w-lg space-y-4">
        <label className="block">
          {t("auth.accountLabel")}
          <input className="ui-input" name="email" type="email" autoComplete="off" required />
        </label>
        <label className="block">
          {t("auth.nameLabel")}
          <input className="ui-input" name="name" required maxLength={100} />
        </label>
        <label className="block">
          {t("auth.passwordLabel")}
          <input
            className="ui-input"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
            required
          />
        </label>
        <label className="block">
          {t("auth.roleLabel")}
          <select className="ui-input" name="role">
            <option value="user">{t("auth.roles.student")}</option>
            <option value="admin">{t("admin.role")}</option>
          </select>
        </label>
        <p>{t("admin.passwordHelp", { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })}</p>
        <button className="ui-input" disabled={pending}>
          {t(pending ? "common.loading" : "admin.create")}
        </button>
        <button type="button" className="px-5 py-2" disabled={pending} onClick={onBack}>
          {t("admin.backToList")}
        </button>
      </form>
      {status && <p role="status">{t(status === "success" ? "admin.success" : "admin.error")}</p>}
    </section>
  );
}
