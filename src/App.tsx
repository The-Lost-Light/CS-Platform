import { ProjectWorkspace } from "@/components/advanced/ProjectWorkspace";
import { AuthProvider } from "@/auth/AuthProvider";
import { AuthGate, type AuthenticatedSession } from "@/auth/AuthGate";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { Navbar } from "@/components/layout/Navbar";
import { PROJECTS } from "@/data/assignmentsData";
import { getLocalizedAssignments } from "@/data/localizedAssignments";
import { useI18n } from "@/i18n";
import type { Project } from "@/types";
import { useMemo, useState } from "react";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-200">
        <AuthGate>{session => <AppContent {...session} />}</AuthGate>
      </div>
    </AuthProvider>
  );
}

function AppContent({ currentUser, logout }: AuthenticatedSession) {
  const { locale } = useI18n();
  const { projects: projects } = useMemo(
    () => getLocalizedAssignments(locale),
    [locale],
  );

  const [activeView, setActiveView] = useState<"home" | "project">("home");
  const [projectID, setProjectID] = useState(PROJECTS[0].id);
  const selectedProject =
    projects.find((item) => item.id === projectID) ?? projects[0];

  const handleOpenProject = (project: Project) => {
    setProjectID(project.id);
    setActiveView("project");
  };

  return (
  <>
    <Navbar
      activeView={activeView}
      selectedProject={activeView === "project" ? selectedProject : null}
      onNavigateHome={() => setActiveView("home")}
      onSelectProjectDefault={() => setActiveView("project")}
      currentUser={currentUser}
      onLogout={logout}
    />

    <main className="flex-1">
      {activeView === "home" && (
        <HomeDashboard
          projects={projects}
          onOpenProject={handleOpenProject}
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
