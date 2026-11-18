import { useI18n } from "@modules/i18n";
import { useWorkspaceAutosave, type AutosaveOptions } from "../hooks/useWorkspaceAutosave";

export function SaveWorkspace(props: AutosaveOptions) {
  const { t } = useI18n();
  const status = useWorkspaceAutosave(props);
  const neutral =
    status === "draft.template" || status === "draft.unsaved" || status === "draft.saving";
  const color = neutral
    ? "bg-surface-sunken border-outline text-on-muted"
    : status === "draft.saved"
      ? "bg-success-container border-success-outline text-on-success-container"
      : "bg-danger-container border-danger-outline text-on-danger-container";
  return (
    <div
      role={neutral || status === "draft.saved" ? "status" : "alert"}
      className={`max-w-sm px-3.5 py-2 rounded-xl text-xs font-semibold border ${color}`}
    >
      {t(status)}
    </div>
  );
}
