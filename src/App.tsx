import type { AdvancedProject, User } from './types';
import { useMemo, useState } from "react";
import { AdvancedProjectWorkspace } from "./components/advanced/AdvancedProjectWorkspace";
import { LoginView } from "./components/auth/LoginView";
import { HomeDashboard } from "./components/home/HomeDashboard";
import { Navbar } from "./components/layout/Navbar";
import { ADVANCED_PROJECTS } from "./data/assignmentsData";
import { useI18n } from './i18n';
import { getLocalizedAssignments } from './data/localizedAssignments';

export default function App() {
  const { locale } = useI18n();
  const { advancedProjects } = useMemo(() => getLocalizedAssignments(locale), [locale]);

  // 登入狀態管理：已登入時絕不顯示登入介面；點擊「登出」後才切換至登入介面
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeView, setActiveView] = useState<'home' | 'project'>("home");
  const [currentUser, setCurrentUser] = useState({
    studentId: "B11204018",
    name: "陳宥軒 (資工三甲)",
    role: "學生 (Student)",
  });
  const [selectedAdvancedId, setSelectedAdvancedId] = useState(ADVANCED_PROJECTS[0].id);
  const selectedAdvanced = advancedProjects.find(item => item.id === selectedAdvancedId) ?? advancedProjects[0];

  const handleOpenProject = (project: AdvancedProject) => {
    setSelectedAdvancedId(project.id);
    setActiveView("project");
  };

  const handleLoginSuccess = (userObj: User) => {
    setCurrentUser(userObj);
    setIsAuthenticated(true);
    setActiveView("home");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-200">
      {!isAuthenticated ? (
        <LoginView onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Navbar
            activeView={activeView}
            selectedProject={activeView === "project" ? selectedAdvanced : null}
            onNavigateHome={() => setActiveView("home")}
            onSelectProjectDefault={() => setActiveView("project")}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          <main className="flex-1">
            {activeView === "home" && (
              <HomeDashboard
                projects={advancedProjects}
                onOpenProject={handleOpenProject}
                currentUser={currentUser}
              />
            )}

            {activeView === "project" && (
              <AdvancedProjectWorkspace
                project={selectedAdvanced}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}
