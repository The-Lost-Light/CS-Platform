import type { Project, ProjectWorkspaceStatus } from "@modules/projects";
import { createContext, useContext } from "react";

export const CatalogContext = createContext<{
  projects: Project[];
  workspaceStatuses: Record<string, ProjectWorkspaceStatus>;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  replaceProjects: (projects: Project[]) => void;
  markWorkspaceSaved: (projectId: string, updatedAt: number) => void;
} | null>(null);

export function useProjectCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("ProjectCatalogProvider is required");
  return context;
}
