import { getLocalizedProjects } from "@data/localizedProjects";
import { PROJECTS } from "@data/projectsData";
import type { Project } from "@domain/project";
import { useI18n } from "@i18n";
import { useState } from "react";

export function usePageNavigation() {
  const { locale } = useI18n();
  const { projects } = getLocalizedProjects(locale);
  const [activeView, setActiveView] = useState<"home" | "project">("home");
  const [projectID, setProjectID] = useState(PROJECTS[0].id);
  const selectedProject = projects.find((project) => project.id === projectID) ?? projects[0];

  const navigateHome = () => setActiveView("home");
  const navigateProject = () => setActiveView("project");
  const openProject = (project: Project) => {
    setProjectID(project.id);
    navigateProject();
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
