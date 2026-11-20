import { useProjectCatalog } from "@modules/catalog";
import type { Project } from "@modules/projects";
import { useParams, useRouter } from "@void/react";

export function usePageNavigation() {
  const { projects } = useProjectCatalog();
  const router = useRouter();
  const { id } = useParams();
  const selectedProject = id ? projects.find((project) => project.id === id) : undefined;

  const openProject = (project: Project) => {
    void router.visit(`/projects/${encodeURIComponent(project.id)}`);
  };

  return {
    projects,
    selectedProject,
    openProject,
  };
}
