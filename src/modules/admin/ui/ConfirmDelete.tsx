import { useI18n } from "@modules/i18n";
import { Button } from "@shared/ui";
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
      className="ui-alert-dialog"
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
        <Button
          variant="outlined"
          disabled={pending}
          onClick={onCancel}
          className="bg-surface text-on-surface border-outline"
        >
          {t("admin.cancel")}
        </Button>
        <Button variant="danger" disabled={pending} onClick={onConfirm}>
          {t(pending ? "common.loading" : "admin.delete")}
        </Button>
      </div>
    </div>
  );
}
