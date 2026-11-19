import { useI18n, type MessageKey } from "@modules/i18n";
import { FormDialog, FormDialogActions } from "@shared/ui/FormDialog";
import { Pencil } from "lucide-react";
import { useState, type FormEvent } from "react";

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const endpoint = management
    ? `/api/admin/accounts/${encodeURIComponent(management.id)}`
    : "/api/account";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { error?: string; signedOut?: boolean };
      if (!response.ok) {
        switch (result.error) {
          case "duplicate":
            setError("admin.duplicateEmail");
            break;
          case "self":
          case "protected":
            setError("admin.protectedAccount");
            break;
          case "invalid":
            setError(management ? "admin.invalidAccount" : "settings.account.invalid");
            break;
          default:
            setError("admin.operationFailed");
        }
      } else if (result.signedOut) {
        window.location.assign("/");
      } else {
        onSaved();
      }
    } catch {
      setError("admin.operationFailed");
    } finally {
      setPending(false);
    }
  }

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
          {management && (
            <label className="ui-field-label">
              {t("auth.roleLabel")}
              <select
                className="ui-input mt-1.5"
                name="role"
                defaultValue={management.role ?? "user"}
              >
                <option value="user" disabled={management.isSelf}>
                  {t("auth.roles.student")}
                </option>
                <option value="admin">{t("admin.role")}</option>
              </select>
            </label>
          )}
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
