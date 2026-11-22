import { useI18n } from "@modules/i18n";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { FormField, SelectField, TextInput } from "@shared/ui";
import { useId } from "react";

export function NewPasswordField({ name, label }: { name: string; label: string }) {
  const { t } = useI18n();
  const helpId = useId();
  return (
    <FormField
      label={label}
      help={t("admin.passwordHelp", { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })}
      helpId={helpId}
      externalHelp
    >
      <TextInput
        name={name}
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        aria-describedby={helpId}
      />
    </FormField>
  );
}

export function AccountRoleField({
  role,
  isSelf = false,
}: {
  role?: string | null;
  isSelf?: boolean;
}) {
  const { t } = useI18n();
  return (
    <FormField label={t("auth.roleLabel")}>
      <SelectField name="role" defaultValue={role ?? "user"}>
        <option value="user" disabled={isSelf}>
          {t("auth.roles.student")}
        </option>
        <option value="admin">{t("admin.role")}</option>
      </SelectField>
    </FormField>
  );
}
