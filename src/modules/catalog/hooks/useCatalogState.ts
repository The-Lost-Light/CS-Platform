import type { Locale } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { useRouter } from "@void/react";
import { useEffect, useState } from "react";
export function useCatalogState(locale: Locale) {
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
  return {
    status,
    retry: () => {
      setStatus("loading");
      setAttempt(attempt + 1);
    },
    catalog: {
      projects,
      removeProject: (id: string) =>
        setProjects((current) => current.filter((project) => project.id !== id)),
      addProject: (project: Project) =>
        setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]),
    },
  };
}
