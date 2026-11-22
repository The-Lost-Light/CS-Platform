import { useI18n } from "@modules/i18n";
import { FormDialog, FormDialogActions } from "@shared/ui/FormDialog";
import { Pencil } from "lucide-react";

import { useAccountUpdate } from "../hooks/useAccountUpdate";
import { AccountRoleField } from "./AccountFields";
import { AccountProfileFields, type AccountProfile } from "./AccountProfileFields";
import { ChangeAccountPassword } from "./ChangeAccountPassword";

export function EditAccountDialog({
  account,
  management,
  onDismiss,
  onSaved,
}: {
  account: AccountProfile;
  management?: { id: string; role: string | null; isSelf: boolean };
  onDismiss: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const endpoint = management
    ? `/api/admin/accounts/${encodeURIComponent(management.id)}`
    : "/api/account";

  const { pending, error, submit } = useAccountUpdate(
    endpoint,
    (code) => {
      switch (code) {
        case "duplicate":
          return "admin.duplicateEmail";
        case "self":
        case "protected":
          return "admin.protectedAccount";
        case "invalid":
          return management ? "admin.invalidAccount" : "settings.account.invalid";
        default:
          return "admin.operationFailed";
      }
    },
    (signedOut) => {
      if (!signedOut) onSaved();
    },
  );

  return (
    <FormDialog
      title={t("admin.editAccount")}
      icon={Pencil}
      headerAction={
        <ChangeAccountPassword
          endpoint={endpoint}
          email={account.email}
          isSelf={management?.isSelf ?? true}
          disabled={pending}
        />
      }
      closeLabel={t("common.close")}
      onDismiss={onDismiss}
      pending={pending}
    >
      <form onSubmit={submit}>
        <fieldset disabled={pending} className="space-y-4">
          <AccountProfileFields account={account} />
          {management && <AccountRoleField role={management.role} isSelf={management.isSelf} />}
          <p className="ui-field-help">{t("admin.accountEditHelp")}</p>
          {error && (
            <div role="alert" className="ui-banner-danger">
              {t(error)}
            </div>
          )}
          <FormDialogActions
            cancelLabel={t("admin.cancel")}
            submitLabel={t(pending ? "common.loading" : "admin.save")}
            onDismiss={onDismiss}
          />
        </fieldset>
      </form>
    </FormDialog>
  );
}
