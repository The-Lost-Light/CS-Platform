import type { AuthenticatedSession } from "@/auth/AuthGate";
import { ProjectWorkspace } from "@/components/advanced/ProjectWorkspace";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { Navbar } from "@/components/layout/Navbar";
import { usePageNavigation } from "./navigation";

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
          <ProjectWorkspace project={selectedProject} />
        )}
      </main>
    </>
  );
}
