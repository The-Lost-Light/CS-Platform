import { useI18n } from "@modules/i18n";
import { useEffect, useId, useRef } from "react";

export function ConfirmDelete({
  name,
  account = false,
  pending,
  onConfirm,
  onCancel,
}: {
  name: string;
  account?: boolean;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.focus();
  }, []);
  return (
    <div
      role="alertdialog"
      ref={panel}
      tabIndex={-1}
      aria-labelledby={`${id}-heading`}
      aria-describedby={`${id}-description`}
      className="bg-danger-container text-on-danger-container rounded-xl p-4 space-y-3"
    >
      <h3 id={`${id}-heading`} className="font-bold">
        {t("admin.confirmDelete", { name })}
      </h3>
      <p id={`${id}-description`}>
        {t(account ? "admin.deleteAccountHelp" : "admin.deleteProjectHelp")}
      </p>
      <button type="button" disabled={pending} onClick={onCancel} className="px-4 py-2">
        {t("admin.cancel")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={onConfirm}
        className="px-4 py-2 rounded-full bg-danger-container border border-danger-outline font-bold"
      >
        {t(pending ? "common.loading" : "admin.delete")}
      </button>
    </div>
  );
}
