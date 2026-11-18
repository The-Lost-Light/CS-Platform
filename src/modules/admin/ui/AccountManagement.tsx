import { useI18n } from "@modules/i18n";

import { useCreateAccount } from "../hooks/useCreateAccount";

export function AccountManagement({ onCreated }: { onCreated?: () => void }) {
  const { t } = useI18n();
  const { pending, status, submit } = useCreateAccount(onCreated);
  return (
    <section className="max-w-lg mx-auto p-6 space-y-4">
      <h2 className="text-xl font-bold">{t("admin.create")}</h2>
      <form onSubmit={submit} className="space-y-4">
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
            minLength={12}
            maxLength={128}
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
        <p>{t("admin.passwordHelp")}</p>
        <button className="ui-input" disabled={pending}>
          {t(pending ? "common.loading" : "admin.create")}
        </button>
      </form>
      {status && <p role="status">{t(status === "success" ? "admin.success" : "admin.error")}</p>}
    </section>
  );
}
