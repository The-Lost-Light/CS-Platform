import { useI18n, type MessageKey } from "@modules/i18n";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { AlertCircle, CheckCircle2, KeyRound, X } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

export function ChangeAccountPassword({
  accountId,
  email,
  isSelf,
  disabled,
}: {
  accountId: string;
  email: string;
  isSelf: boolean;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
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
      const response = await fetch(
        `/api/admin/accounts/${encodeURIComponent(accountId)}/password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: data.get("currentPassword"),
            newPassword: data.get("newPassword"),
          }),
        },
      );
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
      dialog.current?.close();
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
          dialog.current?.showModal();
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
      <dialog
        ref={dialog}
        aria-labelledby={id}
        className="ui-dialog fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md p-0 overflow-hidden"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => form.current?.reset()}
      >
        <form ref={form} onSubmit={submit}>
          <div className="ui-card-header flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="ui-icon-badge w-8 h-8">
                <KeyRound aria-hidden="true" className="w-4 h-4" />
              </div>
              <h3
                id={id}
                className="text-base font-bold text-on-primary-container wrap-break-word min-w-0"
              >
                {t("admin.changePasswordFor", { email })}
              </h3>
            </div>
            <button
              type="button"
              aria-label={t("admin.cancel")}
              className="ui-btn-icon w-8 h-8 shrink-0"
              onClick={() => dialog.current?.close()}
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6">
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
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="ui-btn-text-muted"
                  onClick={() => dialog.current?.close()}
                >
                  {t("admin.cancel")}
                </button>
                <button type="submit" className="ui-btn-primary">
                  {t(pending ? "common.loading" : "admin.savePassword")}
                </button>
              </div>
            </fieldset>
          </div>
        </form>
      </dialog>
    </>
  );
}
