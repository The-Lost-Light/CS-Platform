import { ProjectWorkspace } from "@/components/advanced/ProjectWorkspace";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import type { LoginCredentials } from "@/auth/types";
import { LoginView } from "@/components/auth/LoginView";
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
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { currentUser, login, logout } = useAuth();
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

  const handleLogin = (credentials: LoginCredentials) => {
    const result = login(credentials);
    if (result.ok) setActiveView("home");
    return result;
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-200">
      {!currentUser ? (
        <LoginView onLogin={handleLogin} />
      ) : (
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
      )}
    </div>
  );
}
