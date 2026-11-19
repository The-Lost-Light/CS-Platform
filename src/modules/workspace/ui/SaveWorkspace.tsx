import { useI18n } from "@modules/i18n";
import { AlertCircle, CheckCircle2, Cloud, Loader2 } from "lucide-react";

import { useWorkspaceAutosave, type AutosaveOptions } from "../hooks/useWorkspaceAutosave";

export function SaveWorkspace(props: AutosaveOptions) {
  const { t } = useI18n();
  const status = useWorkspaceAutosave(props);
  const neutral =
    status === "draft.empty" || status === "draft.unsaved" || status === "draft.saving";
  const color = neutral
    ? "bg-surface-container border-outline-subtle text-on-muted"
    : status === "draft.saved"
      ? "bg-success-container border-success-outline text-on-success-container"
      : "bg-danger-container border-danger-outline text-on-danger-container";

  return (
    <div
      role={neutral || status === "draft.saved" ? "status" : "alert"}
      className={`inline-flex items-center gap-1.5 max-w-sm px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${color}`}
    >
      {status === "draft.saved" ? (
        <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
      ) : status === "draft.saving" ? (
        <Loader2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0 animate-spin" />
      ) : neutral ? (
        <Cloud aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{t(status)}</span>
    </div>
  );
}
