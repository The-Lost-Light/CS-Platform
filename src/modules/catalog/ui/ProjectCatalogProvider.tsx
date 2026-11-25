import { useI18n } from "@modules/i18n";
import { Card, FeedbackBanner, LoadingPanel, PageContainer } from "@shared/ui";
import type { ReactNode } from "react";

import { CatalogContext } from "../hooks/ProjectCatalog";
import { useCatalogState } from "../hooks/useCatalogState";

export function ProjectCatalogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { status, retry, catalog } = useCatalogState();
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <LoadingPanel label={t("common.loading")} />
      </div>
    );
  }
  if (status === "error") {
    return (
      <PageContainer>
        <Card as="div" padded>
          <FeedbackBanner kind="error" onRetry={retry} retryLabel={t("auth.retry")}>
            {t("admin.projects.loadError")}
          </FeedbackBanner>
        </Card>
      </PageContainer>
    );
  }
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}
