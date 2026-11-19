import { useI18n } from "@modules/i18n";

export interface AccountProfile {
  name: string;
  email: string;
}

export function AccountProfileFields({ account }: { account?: AccountProfile }) {
  const { t } = useI18n();
  return (
    <>
      <label className="ui-field-label">
        {t("auth.nameLabel")}
        <input
          className="ui-input mt-1.5"
          name="name"
          required
          maxLength={100}
          defaultValue={account?.name}
        />
      </label>
      <label className="ui-field-label">
        {t("auth.accountLabel")}
        <input
          className="ui-input mt-1.5"
          name="email"
          type="email"
          required
          maxLength={254}
          defaultValue={account?.email}
        />
      </label>
    </>
  );
}
