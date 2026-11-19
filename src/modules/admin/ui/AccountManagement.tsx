import { AccountProfileFields } from "@modules/accounts";
import { useI18n } from "@modules/i18n";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { FormDialog, FormDialogActions } from "@shared/ui/FormDialog";
import { UserPlus } from "lucide-react";
import { useId } from "react";

import { useCreateAccount } from "../hooks/useCreateAccount";

export function AccountManagement({
  onCreated,
  onDismiss,
}: {
  onCreated: () => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const passwordHelpId = useId();
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
            <label className="ui-field-label">
              {t("auth.passwordLabel")}
              <input
                className="ui-input mt-1.5"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                aria-describedby={passwordHelpId}
                required
              />
            </label>
            <p id={passwordHelpId} className="ui-field-help">
              {t("admin.passwordHelp", { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })}
            </p>
          </div>
          <label className="ui-field-label">
            {t("auth.roleLabel")}
            <select className="ui-input mt-1.5" name="role">
              <option value="user">{t("auth.roles.student")}</option>
              <option value="admin">{t("admin.role")}</option>
            </select>
          </label>
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
