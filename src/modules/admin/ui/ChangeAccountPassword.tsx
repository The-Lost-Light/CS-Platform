import { useI18n, type MessageKey } from "@modules/i18n";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/passwordPolicy";
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
        {t("admin.changePassword")}
      </button>
      {saved && (
        <p className="col-span-full" role="status">
          {t("admin.passwordChanged")}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={id}
        className="ui-card fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md p-6 backdrop:bg-black/50"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => form.current?.reset()}
      >
        <form ref={form} onSubmit={submit} className="space-y-4">
          <h3 id={id} className="text-lg font-bold wrap-break-word">
            {t("admin.changePasswordFor", { email })}
          </h3>
          <fieldset disabled={pending} className="space-y-4">
            <label className="block">
              {t("admin.currentPassword")}
              <input
                className="ui-input mt-1"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="block">
              {t("admin.newPassword")}
              <input
                className="ui-input mt-1"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                aria-describedby={`${id}-limits`}
              />
            </label>
            <p id={`${id}-limits`} className="text-sm text-on-muted">
              {t("admin.passwordHelp", limits)}
            </p>
            <p className="text-sm text-on-muted">
              {t(isSelf ? "admin.selfPasswordHelp" : "admin.accountEditHelp")}
            </p>
            {error && <p role="alert">{t(error, limits)}</p>}
            <button type="submit" className="ui-btn-primary px-5 py-2">
              {t(pending ? "common.loading" : "admin.savePassword")}
            </button>
            <button type="button" className="px-5 py-2" onClick={() => dialog.current?.close()}>
              {t("admin.cancel")}
            </button>
          </fieldset>
        </form>
      </dialog>
    </>
  );
}
