import { AccountProfileFields, AccountRoleField, NewPasswordField } from "@modules/accounts";
import { useI18n } from "@modules/i18n";
import { FormDialog, FormDialogActions } from "@shared/ui/FormDialog";
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
    >
      <form onSubmit={submit}>
        <fieldset disabled={pending} className="space-y-4">
          <AccountProfileFields />
          <div>
            <NewPasswordField name="password" label={t("auth.passwordLabel")} />
          </div>
          <AccountRoleField />
          {error && (
            <div role="alert" className="ui-banner-danger">
              {t("admin.error")}
            </div>
          )}
          <FormDialogActions
            cancelLabel={t("admin.cancel")}
            submitLabel={t(pending ? "common.loading" : "admin.create")}
            onDismiss={onDismiss}
          />
        </fieldset>
      </form>
    </FormDialog>
  );
}
