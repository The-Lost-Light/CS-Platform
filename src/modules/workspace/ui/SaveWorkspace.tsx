import { useI18n } from "@modules/i18n";
import { Tooltip, cn } from "@shared/ui";
import { Cloud, CloudAlert, CloudCheck } from "lucide-react";

import { useWorkspaceAutosave, type AutosaveOptions } from "../hooks/useWorkspaceAutosave";

function SavingUploadIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <g className="ui-upload-arrow">
        <path d="M12 13v8" />
        <path d="m8 17 4-4 4 4" />
      </g>
    </svg>
  );
}

export function SaveWorkspace(props: AutosaveOptions) {
  const { t } = useI18n();
  const status = useWorkspaceAutosave(props);
  const message = t(status);
  const saved = status === "draft.saved";
  const saving = status === "draft.saving";
  const neutral = status === "draft.empty" || status === "draft.unsaved";
  const isError = !saved && !saving && !neutral;

  const badgeColor = saved
    ? "bg-success-container border-success-outline text-on-success-container"
    : saving
      ? "bg-primary-container border-primary-outline text-on-primary-container"
      : neutral
        ? "bg-surface-container border-outline-subtle text-on-muted"
        : "bg-danger-container border-danger-outline text-on-danger-container";

  return (
    <Tooltip
      as="div"
      align="responsive-start"
      tone={isError ? "danger" : "default"}
      role={null}
      label={message}
    >
      <div
        role={isError ? "alert" : "status"}
        tabIndex={0}
        aria-label={message}
        className={cn(
          "inline-flex items-center justify-center w-9.5 h-9.5 rounded-full border transition-colors cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          badgeColor,
        )}
      >
        {saved ? (
          <CloudCheck aria-hidden="true" className="w-4.5 h-4.5 shrink-0" />
        ) : saving ? (
          <SavingUploadIcon className="w-4.5 h-4.5 shrink-0" />
        ) : neutral ? (
          <Cloud aria-hidden="true" className="w-4.5 h-4.5 shrink-0" />
        ) : (
          <CloudAlert aria-hidden="true" className="w-4.5 h-4.5 shrink-0" />
        )}
        <span className="sr-only">{message}</span>
      </div>
    </Tooltip>
  );
}
