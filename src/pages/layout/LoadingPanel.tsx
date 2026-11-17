import { useI18n } from "@i18n";

export function LoadingPanel() {
  const { t } = useI18n();

  return (
    <div role="status" className="p-6 text-sm text-on-muted">
      {t("common.loading")}
    </div>
  );
}
