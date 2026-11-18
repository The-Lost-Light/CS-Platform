import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Project } from "@domain/project";
import { useI18n } from "@i18n";
import { useRouter } from "@void/react";

const CatalogContext = createContext<{
  projects: Project[];
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
} | null>(null);
export function ProjectCatalogProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const pathname = useRouter().url.pathname;
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/projects?locale=" + locale, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Load failed");
        const data = (await response.json()) as { projects: Project[] };
        if (!controller.signal.aborted) {
          setProjects(data.projects);
          setStatus("ready");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, pathname, locale]);
  if (status === "loading")
    return (
      <p className="p-6" role="status">
        {t("common.loading")}
      </p>
    );
  if (status === "error")
    return (
      <div className="p-6" role="alert">
        {t("admin.projects.loadError")}{" "}
        <button
          onClick={() => {
            setStatus("loading");
            setAttempt(attempt + 1);
          }}
        >
          {t("auth.retry")}
        </button>
      </div>
    );
  return (
    <CatalogContext.Provider
      value={{
        projects,
        removeProject: (id) =>
          setProjects((current) => current.filter((project) => project.id !== id)),
        addProject: (project) =>
          setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]),
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}
export function useProjectCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("ProjectCatalogProvider is required");
  return context;
}
