import type { AdvancedProject, User } from './types';
import { useEffect, useMemo, useState } from "react";
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
  // 主題設定：預設為 'system' (自動依系統設定)，支援 'system' | 'light' | 'dark'
  const [themeMode, setThemeMode] = useState("system");
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const isDark =
    themeMode === "dark" || (themeMode === "system" && systemPrefersDark);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, [isDark]);

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
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen flex flex-col bg-[#F0F4F9] dark:bg-[#121316] text-[#1F1F1F] dark:text-[#E3E2E6] transition-colors duration-200">
        {!isAuthenticated ? (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            themeMode={themeMode}
            onChangeThemeMode={setThemeMode}
          />
        ) : (
          <>
            <Navbar
              activeView={activeView}
              selectedProject={activeView === "project" ? selectedAdvanced : null}
              onNavigateHome={() => setActiveView("home")}
              onSelectProjectDefault={() => setActiveView("project")}
              currentUser={currentUser}
              onLogout={handleLogout}
              themeMode={themeMode}
              onChangeThemeMode={setThemeMode}
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
    </div>
  );
}
