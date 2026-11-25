import { useI18n } from "@modules/i18n";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import {
  Button,
  FormDialog,
  FormField,
  TextInput,
  TransientNotice,
  useTransientNotice,
} from "@shared/ui";
import { KeyRound } from "lucide-react";
import { useState } from "react";

import { useAccountUpdate } from "../hooks/useAccountUpdate";
import { NewPasswordField } from "./AccountFields";

export function ChangeAccountPassword({
  endpoint,
  email,
  isSelf,
  requireCurrentPassword = true,
  initialOpen = false,
  initialNotice = null,
  disabled,
}: {
  endpoint: string;
  email: string;
  isSelf: boolean;
  requireCurrentPassword?: boolean;
  initialOpen?: boolean;
  initialNotice?: "admin.passwordChanged" | null;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(initialOpen);
  const {
    notice: savedNotice,
    show: showSavedNotice,
    clear: clearSavedNotice,
  } = useTransientNotice<"admin.passwordChanged">(initialNotice);
  const limits = { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH };

  const { pending, error, submit, clearError } = useAccountUpdate(
    endpoint + "/password",
    (code) => {
      switch (code) {
        case "invalidCurrentPassword":
          return requireCurrentPassword ? "admin.invalidCurrentPassword" : "admin.accountConflict";
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
      if (!signedOut) showSavedNotice("admin.passwordChanged");
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
          clearSavedNotice();
          clearError();
          setOpen(true);
        }}
      >
        <span>{t("admin.changePassword")}</span>
      </Button>
      <TransientNotice
        message={savedNotice && t(savedNotice)}
        className="col-span-full justify-self-end mt-1"
      />
      {open && (
        <FormDialog
          title={t("admin.changePasswordFor", { email })}
          icon={KeyRound}
          closeLabel={t("common.close")}
          onDismiss={() => setOpen(false)}
          pending={pending}
          error={error ? t(error, limits) : null}
          cancelLabel={t("admin.cancel")}
          submitLabel={t(pending ? "common.loading" : "admin.savePassword")}
          onSubmit={submit}
        >
          {requireCurrentPassword && (
            <FormField label={t("admin.currentPassword")}>
              <TextInput
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </FormField>
          )}
          <NewPasswordField name="newPassword" label={t("admin.newPassword")} />
          <p className="ui-field-help">
            {t(isSelf ? "admin.selfPasswordHelp" : "admin.accountEditHelp")}
          </p>
        </FormDialog>
      )}
    </>
  );
}
