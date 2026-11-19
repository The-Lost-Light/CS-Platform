import { useI18n, type MessageKey } from "@modules/i18n";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { FormDialog, FormDialogActions } from "@shared/ui/FormDialog";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

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
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);
  const limits = { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`${endpoint}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
        }),
      });
      const result = (await response.json()) as { error?: string; signedOut?: boolean };
      if (!response.ok) {
        setError(
          result.error === "invalidCurrentPassword"
            ? "admin.invalidCurrentPassword"
            : result.error === "invalid"
              ? "admin.passwordHelp"
              : result.error === "conflict"
                ? "admin.accountConflict"
                : "admin.operationFailed",
        );
        return;
      }
      setOpen(false);
      if (result.signedOut) window.location.assign("/");
      else setSaved(true);
    } catch {
      setError("admin.operationFailed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="ui-btn-tonal"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          setSaved(false);
          setError(null);
          setOpen(true);
        }}
      >
        <KeyRound aria-hidden="true" className="w-3.5 h-3.5" />
        <span>{t("admin.changePassword")}</span>
      </button>
      {saved && (
        <div className="col-span-full ui-banner-success mt-2" role="status">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>{t("admin.passwordChanged")}</span>
          </div>
        </div>
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
              <label className="ui-field-label">
                {t("admin.currentPassword")}
                <input
                  className="ui-input mt-1.5"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="ui-field-label">
                {t("admin.newPassword")}
                <input
                  className="ui-input mt-1.5"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={MAX_PASSWORD_LENGTH}
                  aria-describedby={`${id}-limits`}
                />
              </label>
              <p id={`${id}-limits`} className="ui-field-help">
                {t("admin.passwordHelp", limits)}
              </p>
              <p className="ui-field-help">
                {t(isSelf ? "admin.selfPasswordHelp" : "admin.accountEditHelp")}
              </p>
              {error && (
                <div role="alert" className="ui-banner-danger">
                  <div className="flex items-center gap-2">
                    <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
                    <span>{t(error, limits)}</span>
                  </div>
                </div>
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
