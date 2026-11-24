import type { Locale } from "@modules/i18n";
import type { Project, ProjectWorkspaceStatus } from "@modules/projects";
import { useCallback, useEffect, useState } from "react";

export function useCatalogState(locale: Locale) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceStatuses, setWorkspaceStatuses] = useState<
    Record<string, ProjectWorkspaceStatus>
  >({});
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
        const data = (await response.json()) as {
          projects: Project[];
          workspaceStatuses?: Record<string, ProjectWorkspaceStatus>;
        };
        if (!controller.signal.aborted) {
          setProjects(data.projects);
          setWorkspaceStatuses(data.workspaceStatuses ?? {});
          setStatus("ready");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, locale]);

  const removeProject = useCallback((id: string) => {
    setProjects((current) =>
      current
        .filter((project) => project.id !== id)
        .map((project, index) => ({ ...project, index: index + 1 })),
    );
    setWorkspaceStatuses((current) => {
      if (!(id in current)) return current;
      const { [id]: _, ...rest } = current;
      return rest;
    });
  }, []);

  const addProject = useCallback((project: Project) => {
    setProjects((current) =>
      [...current.filter((item) => item.id !== project.id), project].sort(
        (a, b) => a.index - b.index,
      ),
    );
  }, []);

  const replaceProjects = useCallback((nextProjects: Project[]) => {
    setProjects(nextProjects);
  }, []);

  const markWorkspaceSaved = useCallback((projectId: string, updatedAt: number) => {
    setWorkspaceStatuses((current) => ({
      ...current,
      [projectId]: { hasWorkspace: true, updatedAt },
    }));
  }, []);

  return {
    status,
    retry: () => {
      setStatus("loading");
      setAttempt(attempt + 1);
    },
    catalog: {
      projects,
      workspaceStatuses,
      removeProject,
      addProject,
      replaceProjects,
      markWorkspaceSaved,
    },
  };
}
