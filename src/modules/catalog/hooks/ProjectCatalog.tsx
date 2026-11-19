import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { createContext, useContext, type ReactNode } from "react";

import { useCatalogState } from "./useCatalogState";

const CatalogContext = createContext<{
  projects: Project[];
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
} | null>(null);
export function ProjectCatalogProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const { status, retry, catalog } = useCatalogState(locale);
  if (status === "loading")
    return (
      <p className="p-6" role="status">
        {t("common.loading")}
      </p>
    );
  if (status === "error")
    return (
      <div className="p-6" role="alert">
        {t("admin.projects.loadError")} <button onClick={retry}>{t("auth.retry")}</button>
      </div>
    );
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}
export function useProjectCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("ProjectCatalogProvider is required");
  return context;
}
