import { ProjectWorkspace } from "@/components/advanced/ProjectWorkspace";
import { LoginView } from "@/components/auth/LoginView";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { Navbar } from "@/components/layout/Navbar";
import { PROJECTS } from "@/data/assignmentsData";
import { getLocalizedAssignments } from "@/data/localizedAssignments";
import { useI18n } from "@/i18n";
import type { Project, User } from "@/types";
import { useMemo, useState } from "react";

export default function App() {
  const { locale } = useI18n();
  const { projects: projects } = useMemo(
    () => getLocalizedAssignments(locale),
    [locale],
  );

  const [activeView, setActiveView] = useState<"home" | "project">("home");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projectID, setProjectID] = useState(PROJECTS[0].id);
  const selectedProject =
    projects.find((item) => item.id === projectID) ?? projects[0];

  const handleOpenProject = (project: Project) => {
    setProjectID(project.id);
    setActiveView("project");
  };

  const handleLoginSuccess = (userObj: User) => {
    setCurrentUser(userObj);
    setActiveView("home");
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-200">
      {!currentUser ? (
        <LoginView onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Navbar
            activeView={activeView}
            selectedProject={activeView === "project" ? selectedProject : null}
            onNavigateHome={() => setActiveView("home")}
            onSelectProjectDefault={() => setActiveView("project")}
            currentUser={currentUser}
            onLogout={handleLogout}
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
