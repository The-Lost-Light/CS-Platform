import { useI18n } from "@modules/i18n";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import {
  Button,
  FeedbackBanner,
  FormDialog,
  FormDialogActions,
  FormField,
  TextInput,
} from "@shared/ui";
import { KeyRound } from "lucide-react";
import { useState } from "react";

import { useAccountUpdate } from "../hooks/useAccountUpdate";
import { NewPasswordField } from "./AccountFields";

export function ChangeAccountPassword({
  endpoint,
  email,
  isSelf,
  disabled,
}: {
  endpoint: string;
  email: string;
  isSelf: boolean;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const limits = { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH };

  const { pending, error, submit, clearError } = useAccountUpdate(
    endpoint + "/password",
    (code) => {
      switch (code) {
        case "invalidCurrentPassword":
          return "admin.invalidCurrentPassword";
        case "invalid":
          return "admin.passwordHelp";
        case "conflict":
          return "admin.accountConflict";
        default:
          return "admin.operationFailed";
      }
    },
    (signedOut) => {
      setOpen(false);
      if (!signedOut) setSaved(true);
    },
  );

  return (
    <>
      <Button
        variant="tonal"
        icon={KeyRound}
        iconClassName="w-3.5 h-3.5"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          setSaved(false);
          clearError();
          setOpen(true);
        }}
      >
        <span>{t("admin.changePassword")}</span>
      </Button>
      {saved && (
        <FeedbackBanner kind="success" className="col-span-full mt-2">
          <span>{t("admin.passwordChanged")}</span>
        </FeedbackBanner>
      )}
      {open && (
        <FormDialog
          title={t("admin.changePasswordFor", { email })}
          icon={KeyRound}
          closeLabel={t("common.close")}
          onDismiss={() => setOpen(false)}
          pending={pending}
        >
          <form onSubmit={submit}>
            <fieldset disabled={pending} className="space-y-4">
              <FormField label={t("admin.currentPassword")}>
                <TextInput
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </FormField>
              <NewPasswordField name="newPassword" label={t("admin.newPassword")} />
              <p className="ui-field-help">
                {t(isSelf ? "admin.selfPasswordHelp" : "admin.accountEditHelp")}
              </p>
              {error && (
                <FeedbackBanner kind="error">
                  <span>{t(error, limits)}</span>
                </FeedbackBanner>
              )}
              <FormDialogActions
                cancelLabel={t("admin.cancel")}
                submitLabel={t(pending ? "common.loading" : "admin.savePassword")}
                onDismiss={() => setOpen(false)}
              />
            </fieldset>
          </form>
        </FormDialog>
      )}
    </>
  );
}
