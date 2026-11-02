import type { BasicAssignment, AdvancedProject, ChangeRecord, ChangeStats, User } from './types';
import { useEffect, useMemo, useState } from "react";
import { AdvancedProjectWorkspace } from "./components/advanced/AdvancedProjectWorkspace";
import { LoginView } from "./components/auth/LoginView";
import { BasicAssignmentWorkspace } from "./components/basic/BasicAssignmentWorkspace";
import { HomeDashboard } from "./components/home/HomeDashboard";
import { Navbar } from "./components/layout/Navbar";
import { ADVANCED_PROJECTS, BASIC_ASSIGNMENTS } from "./data/assignmentsData";
import { summarizeChangeRecords } from "./utils/changeTracker";
import { useI18n } from './i18n';
import { getLocalizedAssignments } from './data/localizedAssignments';

export default function App() {
  const { locale } = useI18n();
  const { basicAssignments, advancedProjects } = useMemo(() => getLocalizedAssignments(locale), [locale]);
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
  const [activeView, setActiveView] = useState("home"); // 'home' | 'basic' | 'advanced'
  const [currentUser, setCurrentUser] = useState({
    studentId: "B11204018",
    name: "陳宥軒 (資工三甲)",
    role: "學生 (Student)",
  });
  const [selectedBasicId, setSelectedBasicId] = useState(BASIC_ASSIGNMENTS[0].id);
  const [selectedAdvancedId, setSelectedAdvancedId] = useState(ADVANCED_PROJECTS[0].id);
  const selectedBasic = basicAssignments.find(item => item.id === selectedBasicId) ?? basicAssignments[0];
  const selectedAdvanced = advancedProjects.find(item => item.id === selectedAdvancedId) ?? advancedProjects[0];

  // 保存每個基礎作業的編輯變更紀錄 (Insert / Delete / Replace)
  const [recordsByAssignment, setRecordsByAssignment] = useState<Record<string, ChangeRecord[]>>({
    "basic-fib-dp": [
      {
        id: "1",
        timestamp: new Date(Date.now() - 180000).toISOString(),
        file: "hw-01.py",
        filePath: "/workspace/hw-01.py",
        line: 9,
        column: 5,
        endLine: 9,
        endColumn: 20,
        type: "insert",
        removed: "",
        inserted: "if n == 1:\n        return [0]",
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 95000).toISOString(),
        file: "hw-01.py",
        filePath: "/workspace/hw-01.py",
        line: 17,
        column: 39,
        endLine: 17,
        endColumn: 41,
        type: "replace",
        removed: "5",
        inserted: "10",
      },
    ],
  });

  const handleOpenAssignment = (item: BasicAssignment | AdvancedProject) => {
    if (item.type === "basic") {
      setSelectedBasicId(item.id);
      setActiveView("basic");
    } else {
      setSelectedAdvancedId(item.id);
      setActiveView("advanced");
    }
  };

  const handleLoginSuccess = (userObj: User) => {
    setCurrentUser(userObj);
    setIsAuthenticated(true);
    setActiveView("home");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // 計算每個基礎作業的統計摘要供首頁與導覽列顯示
  const changeStatsByAssignment: Record<string, ChangeStats> = {};
  let totalEditCount = 0;
  for (const hw of BASIC_ASSIGNMENTS) {
    const recs = recordsByAssignment[hw.id] || [];
    const st = summarizeChangeRecords(recs);
    changeStatsByAssignment[hw.id] = st;
    totalEditCount += st.total;
  }

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
              selectedAssignment={
                activeView === "basic"
                  ? selectedBasic
                  : activeView === "advanced"
                    ? selectedAdvanced
                    : null
              }
              onNavigateHome={() => setActiveView("home")}
              onSelectBasicDefault={() => setActiveView("basic")}
              onSelectAdvancedDefault={() => setActiveView("advanced")}
              totalEditCount={totalEditCount}
              currentUser={currentUser}
              onLogout={handleLogout}
              themeMode={themeMode}
              onChangeThemeMode={setThemeMode}
            />

            <main className="flex-1">
              {activeView === "home" && (
                <HomeDashboard
                  basicAssignments={basicAssignments}
                  advancedProjects={advancedProjects}
                  onOpenAssignment={handleOpenAssignment}
                  changeStatsByAssignment={changeStatsByAssignment}
                  currentUser={currentUser}
                />
              )}

              {activeView === "basic" && (
                <BasicAssignmentWorkspace
                  assignment={selectedBasic}
                  allBasicAssignments={basicAssignments}
                  onSelectAssignment={(hw) => setSelectedBasicId(hw.id)}
                  onBackHome={() => setActiveView("home")}
                  records={recordsByAssignment[selectedBasic.id] || []}
                  onUpdateRecords={(nextRecs) =>
                    setRecordsByAssignment((prev) => ({
                      ...prev,
                      [selectedBasic.id]: nextRecs,
                    }))
                  }
                />
              )}

              {activeView === "advanced" && (
                <AdvancedProjectWorkspace
                  project={selectedAdvanced}
                  allAdvancedProjects={advancedProjects}
                  onSelectProject={(proj) => setSelectedAdvancedId(proj.id)}
                  onBackHome={() => setActiveView("home")}
                />
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}
