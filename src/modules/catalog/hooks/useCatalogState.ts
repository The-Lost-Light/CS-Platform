import type { Project, ProjectWorkspaceStatus } from "@modules/projects";
import { useAsyncLoad } from "@shared/useAsyncLoad";
import { useCallback } from "react";

interface CatalogPayload {
  projects: Project[];
  workspaceStatuses: Record<string, ProjectWorkspaceStatus>;
}

const EMPTY_CATALOG: CatalogPayload = { projects: [], workspaceStatuses: {} };

export function useCatalogState() {
  const { data, setData, loading, error, reload } = useAsyncLoad<CatalogPayload>(async (signal) => {
    const response = await fetch("/api/projects", {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Load failed");
    const payload = (await response.json()) as {
      projects: Project[];
      workspaceStatuses?: Record<string, ProjectWorkspaceStatus>;
    };
    return {
      projects: payload.projects,
      workspaceStatuses: payload.workspaceStatuses ?? {},
    };
  });

  const projects = data?.projects ?? EMPTY_CATALOG.projects;
  const workspaceStatuses = data?.workspaceStatuses ?? EMPTY_CATALOG.workspaceStatuses;

  const removeProject = useCallback(
    (id: string) => {
      setData((current) => {
        const base = current ?? EMPTY_CATALOG;
        const nextStatuses =
          id in base.workspaceStatuses
            ? Object.fromEntries(
                Object.entries(base.workspaceStatuses).filter(([key]) => key !== id),
              )
            : base.workspaceStatuses;
        return {
          projects: base.projects
            .filter((project) => project.id !== id)
            .map((project, index) => ({ ...project, index: index + 1 })),
          workspaceStatuses: nextStatuses,
        };
      });
    },
    [setData],
  );

  const addProject = useCallback(
    (project: Project) => {
      setData((current) => {
        const base = current ?? EMPTY_CATALOG;
        return {
          ...base,
          projects: [...base.projects.filter((item) => item.id !== project.id), project].sort(
            (a, b) => a.index - b.index,
          ),
        };
      });
    },
    [setData],
  );

  const replaceProjects = useCallback(
    (nextProjects: Project[]) => {
      setData((current) => ({
        projects: nextProjects,
        workspaceStatuses: current?.workspaceStatuses ?? {},
      }));
    },
    [setData],
  );

  const markWorkspaceSaved = useCallback(
    (projectId: string, updatedAt: number) => {
      setData((current) => {
        const base = current ?? EMPTY_CATALOG;
        return {
          ...base,
          workspaceStatuses: {
            ...base.workspaceStatuses,
            [projectId]: { hasWorkspace: true, updatedAt },
          },
        };
      });
    },
    [setData],
  );

  const status: "loading" | "ready" | "error" = error
    ? "error"
    : loading || !data
      ? "loading"
      : "ready";

  return {
    status,
    retry: reload,
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
