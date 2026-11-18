import { getLocalizedProjects } from "@data/localizedProjects";
import type { Project } from "@domain/project";
import { useI18n } from "@i18n";
import { useParams, useRouter } from "@void/react";
import { useProjectCatalog } from "@hooks/ProjectCatalog";

export function usePageNavigation() {
  const { locale } = useI18n();
  const catalog = useProjectCatalog();
  const projects = [...getLocalizedProjects(locale).projects, ...catalog.projects];
  const router = useRouter();
  const { id } = useParams();
  const activeView: "home" | "project" | "admin" =
    router.url.pathname === "/admin" ? "admin" : id ? "project" : "home";
  const selectedProject = id ? projects.find((project) => project.id === id) : projects[0];

  const navigateHome = () => {
    void router.visit("/");
  };
  const navigateProject = () => {
    void router.visit(`/projects/${encodeURIComponent((selectedProject ?? projects[0]).id)}`);
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
