import { useI18n } from "@modules/i18n";
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
        <TextInput name="name" required maxLength={100} defaultValue={account?.name} />
      </FormField>
      <FormField label={t("auth.accountLabel")}>
        <TextInput
          name="email"
          type="email"
          required
          maxLength={254}
          defaultValue={account?.email}
        />
      </FormField>
    </>
  );
}
