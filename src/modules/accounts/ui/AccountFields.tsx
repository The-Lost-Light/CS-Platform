import { useI18n } from "@modules/i18n";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { useId } from "react";

export function NewPasswordField({ name, label }: { name: string; label: string }) {
  const { t } = useI18n();
  const helpId = useId();
  return (
    <>
      <label className="ui-field-label">
        {label}
        <input
          className="ui-input mt-1.5"
          name={name}
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          aria-describedby={helpId}
        />
      </label>
      <p id={helpId} className="ui-field-help">
        {t("admin.passwordHelp", { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })}
      </p>
    </>
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
    <label className="ui-field-label">
      {t("auth.roleLabel")}
      <select className="ui-input mt-1.5" name="role" defaultValue={role ?? "user"}>
        <option value="user" disabled={isSelf}>
          {t("auth.roles.student")}
        </option>
        <option value="admin">{t("admin.role")}</option>
      </select>
    </label>
  );
}
