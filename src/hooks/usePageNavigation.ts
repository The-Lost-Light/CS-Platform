import type { Project } from "@domain/project";
import { useParams, useRouter } from "@void/react";
import { useProjectCatalog } from "@hooks/ProjectCatalog";

export function usePageNavigation() {
  const catalog = useProjectCatalog();
  const projects = catalog.projects;
  const router = useRouter();
  const { id } = useParams();
  const activeView: "home" | "project" | "admin" =
    router.url.pathname === "/admin" ? "admin" : id ? "project" : "home";
  const selectedProject = id ? projects.find((project) => project.id === id) : projects[0];

  const navigateHome = () => {
    void router.visit("/");
  };
  const navigateProject = () => {
    const project = selectedProject ?? projects[0];
    if (project) void router.visit(`/projects/${encodeURIComponent(project.id)}`);
  };
  const openProject = (project: Project) => {
    void router.visit(`/projects/${encodeURIComponent(project.id)}`);
  };

  return {
    activeView,
    projects,
    selectedProject,
    navigateHome,
    navigateProject,
    openProject,
  };
}
