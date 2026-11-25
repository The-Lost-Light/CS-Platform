import { useI18n } from "@modules/i18n";
import { FeedbackBanner, FormDialog, FormDialogActions } from "@shared/ui";
import { AlertTriangle } from "lucide-react";
import { useId } from "react";

export function ConfirmDelete({
  name,
  account = false,
  pending,
  error = null,
  onConfirm,
  onCancel,
}: {
  name: string;
  account?: boolean;
  pending: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const descriptionId = useId();
  return (
    <FormDialog
      role="alertdialog"
      describedBy={descriptionId}
      title={t("admin.confirmDelete", { name })}
      icon={AlertTriangle}
      iconTone="danger"
      closeLabel={t("common.close")}
      onDismiss={onCancel}
      pending={pending}
    >
      <p id={descriptionId} className="text-sm leading-relaxed text-on-muted">
        {t(account ? "admin.deleteAccountHelp" : "admin.deleteProjectHelp")}
      </p>
      {error && (
        <FeedbackBanner kind="error">
          <span>{error}</span>
        </FeedbackBanner>
      )}
      <FormDialogActions
        cancelLabel={t("admin.cancel")}
        submitLabel={t(pending ? "common.loading" : "admin.delete")}
        submitVariant="danger"
        disabled={pending}
        onDismiss={onCancel}
        onSubmit={onConfirm}
      />
    </FormDialog>
  );
}
