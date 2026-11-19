import { useI18n } from "@modules/i18n";
import { AlertTriangle } from "lucide-react";
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
      className="rounded-xl border border-danger-outline bg-danger-container p-5 text-on-danger-container shadow-m3-1 space-y-3.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-danger"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle aria-hidden="true" className="w-5 h-5 shrink-0 text-danger" />
        <h3 id={`${id}-heading`} className="font-bold text-sm sm:text-base">
          {t("admin.confirmDelete", { name })}
        </h3>
      </div>
      <p id={`${id}-description`} className="text-xs sm:text-sm leading-relaxed">
        {t(account ? "admin.deleteAccountHelp" : "admin.deleteProjectHelp")}
      </p>
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="ui-btn-outlined bg-surface text-on-surface border-outline"
        >
          {t("admin.cancel")}
        </button>
        <button type="button" disabled={pending} onClick={onConfirm} className="ui-btn-danger">
          {t(pending ? "common.loading" : "admin.delete")}
        </button>
      </div>
    </div>
  );
}
