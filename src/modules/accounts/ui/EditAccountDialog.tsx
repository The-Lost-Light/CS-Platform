import { useI18n } from "@modules/i18n";
import { FormDialog } from "@shared/ui";
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
  const isSelf = management?.isSelf ?? true;
  const requireCurrentPassword = isSelf || management?.role === "admin";
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
          isSelf={isSelf}
          requireCurrentPassword={requireCurrentPassword}
          disabled={pending}
        />
      }
      closeLabel={t("common.close")}
      onDismiss={onDismiss}
      pending={pending}
      error={error ? t(error) : null}
      cancelLabel={t("admin.cancel")}
      submitLabel={t(pending ? "common.loading" : "admin.save")}
      onSubmit={submit}
    >
      <AccountProfileFields account={account} />
      {management && <AccountRoleField role={management.role} isSelf={management.isSelf} />}
      <p className="ui-field-help">{t("admin.accountEditHelp")}</p>
    </FormDialog>
  );
}
