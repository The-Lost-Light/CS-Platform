import { useI18n } from "@modules/i18n";
import { MAX_ACCOUNT_EMAIL_LENGTH, MAX_ACCOUNT_NAME_LENGTH } from "@shared/accountPolicy";
import { FormField, TextInput } from "@shared/ui";

export interface AccountProfile {
  name: string;
  email: string;
}

export function AccountProfileFields({ account }: { account?: AccountProfile }) {
  const { t } = useI18n();
  return (
    <>
      <FormField label={t("auth.nameLabel")}>
        <TextInput
          name="name"
          required
          maxLength={MAX_ACCOUNT_NAME_LENGTH}
          defaultValue={account?.name}
        />
      </FormField>
      <FormField label={t("auth.accountLabel")}>
        <TextInput
          name="email"
          type="email"
          required
          maxLength={MAX_ACCOUNT_EMAIL_LENGTH}
          defaultValue={account?.email}
        />
      </FormField>
    </>
  );
}
