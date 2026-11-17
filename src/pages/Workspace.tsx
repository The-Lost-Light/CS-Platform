import { lazy, Suspense } from "react";
import type { AuthenticatedSession } from "@auth/types";
import { HomeDashboard } from "@pages/home/HomeDashboard";
import { Navbar } from "@pages/layout/Navbar";
import { LoadingPanel } from "@pages/layout/LoadingPanel";
import { usePageNavigation } from "@hooks/usePageNavigation";

const ProjectWorkspace = lazy(() =>
  import("@pages/project/ProjectWorkspace").then((module) => ({
    default: module.ProjectWorkspace,
  })),
);

export function WorkSpace({ currentUser, logout }: AuthenticatedSession) {
  const {
    activeView,
    projects,
    selectedProject,
    navigateHome,
    navigateProject,
    openProject,
  } = usePageNavigation();

  return (
    <>
      <Navbar
        activeView={activeView}
        selectedProject={activeView === "project" ? selectedProject : null}
        onNavigateHome={navigateHome}
        onSelectProjectDefault={navigateProject}
        currentUser={currentUser}
        onLogout={logout}
      />

      <main className="flex-1">
        {activeView === "home" && (
          <HomeDashboard
            projects={projects}
            onOpenProject={openProject}
            currentUser={currentUser}
          />
        )}
        {activeView === "project" && (
          <Suspense fallback={<LoadingPanel />}>
            <ProjectWorkspace project={selectedProject} />
          </Suspense>
        )}
      </main>
    </>
  );
}
