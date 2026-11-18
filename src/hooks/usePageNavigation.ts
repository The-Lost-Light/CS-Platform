import { getLocalizedProjects } from "@data/localizedProjects";
import type { Project } from "@domain/project";
import { useI18n } from "@i18n";
import { useParams, useRouter } from "@void/react";

export function usePageNavigation() {
  const { locale } = useI18n();
  const { projects } = getLocalizedProjects(locale);
  const router = useRouter();
  const { id } = useParams();
  const activeView: "home" | "project" = id ? "project" : "home";
  const selectedProject = projects.find((project) => project.id === id) ?? projects[0];

  const navigateHome = () => {
    void router.visit("/");
  };
  const navigateProject = () => {
    void router.visit(`/projects/${encodeURIComponent(selectedProject.id)}`);
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
