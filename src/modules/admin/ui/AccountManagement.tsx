import { AccountProfileFields, AccountRoleField, NewPasswordField } from "@modules/accounts";
import { useI18n } from "@modules/i18n";
import { FormDialog } from "@shared/ui";
import { UserPlus } from "lucide-react";

import { useCreateAccount } from "../hooks/useCreateAccount";

export function AccountManagement({
  onCreated,
  onDismiss,
}: {
  onCreated: () => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const { pending, error, submit } = useCreateAccount(onCreated);
  return (
    <FormDialog
      title={t("admin.create")}
      icon={UserPlus}
      closeLabel={t("common.close")}
      onDismiss={onDismiss}
      pending={pending}
      error={error ? t("admin.error") : null}
      cancelLabel={t("admin.cancel")}
      submitLabel={t(pending ? "common.loading" : "admin.create")}
      onSubmit={submit}
    >
      <AccountProfileFields />
      <NewPasswordField name="password" label={t("auth.passwordLabel")} />
      <AccountRoleField />
    </FormDialog>
  );
}
