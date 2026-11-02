import { useI18n } from '../../i18n';
import type { BasicAssignment, AdvancedProject, User } from '../../types';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  Code2,
  Home,
  Terminal,
  FolderGit2,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

export function Navbar({
  activeView,
  selectedAssignment,
  onNavigateHome,
  onSelectBasicDefault,
  onSelectAdvancedDefault,
  totalEditCount = 0,
  currentUser,
  onLogout,
  themeMode = 'system',
  onChangeThemeMode,
}: { activeView: string; selectedAssignment: BasicAssignment | AdvancedProject | null; onNavigateHome: () => void; onSelectBasicDefault: () => void; onSelectAdvancedDefault: () => void; totalEditCount?: number; currentUser: User; onLogout: () => void; themeMode?: string; onChangeThemeMode: (mode: string) => void }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#1E1F23] border-b border-slate-200 dark:border-[#33353A] shadow-xs transition-colors">
      <div className="w-full px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Material Design 3 Brand & Active Breadcrumb */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-left group focus:outline-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0B57D0] dark:bg-[#A8C7FA] flex items-center justify-center text-white dark:text-[#041E49] shadow-xs group-hover:opacity-90 transition">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[#1F1F1F] dark:text-[#E3E2E6]">
                  CodePulse Edu
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF]">
                  Material Design
                </span>
              </div>
            </div>
          </button>

          {selectedAssignment && (activeView === 'basic' || activeView === 'advanced') && (
            <div className="hidden xl:flex items-center gap-2 pl-2.5 ml-1 border-l border-slate-200 dark:border-[#33353A] text-xs">
              <span
                className={`px-2 py-0.5 rounded-full font-mono font-bold ${
                  selectedAssignment.type === 'basic'
                    ? 'bg-[#CEEAD6] dark:bg-[#0F5223] text-[#0D652D] dark:text-[#C4EED0]'
                    : 'bg-[#EADDFF] dark:bg-[#4F378B] text-[#4F378B] dark:text-[#EADDFF]'
                }`}
              >
                {selectedAssignment.codeName}
              </span>
              <span className="text-[#1F1F1F] dark:text-[#E3E2E6] font-semibold truncate max-w-[240px]">
                {selectedAssignment.title}
              </span>
            </div>
          )}
        </div>

        {/* Right: Navigation Pills + Theme Switcher (System / Light / Dark) + Account Logout */}
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex max-w-full flex-wrap items-center gap-1 bg-[#F0F4F9] dark:bg-[#121316] p-1 rounded-2xl sm:rounded-full border border-slate-200 dark:border-[#33353A]">
            <button
              type="button"
              onClick={onNavigateHome}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                activeView === 'home'
                  ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] shadow-xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-white dark:hover:bg-[#282A2F] hover:text-[#1F1F1F] dark:hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t("作業總覽首頁")}</span>
            </button>

            <button
              type="button"
              onClick={onSelectBasicDefault}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                activeView === 'basic'
                  ? 'bg-[#137333] dark:bg-[#81C995] text-white dark:text-[#072711] shadow-xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-white dark:hover:bg-[#282A2F] hover:text-[#1F1F1F] dark:hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{t("基礎程式作業")}</span>
              {totalEditCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#CEEAD6] dark:bg-[#0F5223] text-[#0D652D] dark:text-[#C4EED0] font-mono text-[10px]">
                  {totalEditCount}{t(" 變更")}</span>
              )}
            </button>

            <button
              type="button"
              onClick={onSelectAdvancedDefault}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                activeView === 'advanced'
                  ? 'bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] shadow-xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-white dark:hover:bg-[#282A2F] hover:text-[#1F1F1F] dark:hover:text-white'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{t("進階專題作業")}</span>
            </button>
          </nav>

          <LanguageSwitcher />
          {/* Theme Switcher: 自動 (System) / 淺色 (Light) / 深色 (Dark) */}
          <div
            className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#121316] p-1 rounded-full border border-slate-200 dark:border-[#33353A]"
            role="group"
            aria-label={t("主題配色切換")}
          >
            <button
              type="button"
              onClick={() => onChangeThemeMode?.('system')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                themeMode === 'system'
                  ? 'bg-white dark:bg-[#282A2F] text-[#0B57D0] dark:text-[#A8C7FA] shadow-2xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:hover:text-white'
              }`}
              title={t("自動依系統設定切換深淺色")}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t("自動")}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeThemeMode?.('light')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                themeMode === 'light'
                  ? 'bg-white text-[#0B57D0] shadow-2xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:hover:text-white'
              }`}
              title={t("淺色模式 (Light Mode)")}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{t("淺色")}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeThemeMode?.('dark')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                themeMode === 'dark'
                  ? 'bg-[#282A2F] text-[#A8C7FA] shadow-2xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:hover:text-white'
              }`}
              title={t("深色模式 (Dark Mode)")}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{t("深色")}</span>
            </button>
          </div>

          {/* Current Logged-in Student Badge & Logout */}
          {currentUser && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-[#33353A]">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] text-xs">
                <div className="w-5 h-5 rounded-full bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] text-[11px] font-bold flex items-center justify-center">
                  {currentUser.name?.slice(0, 1) || 'S'}
                </div>
                <span className="font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">
                  {currentUser.name}
                </span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-[#282A2F] hover:bg-[#FAD2CF]/60 dark:hover:bg-[#8C1D18]/40 text-[#444746] dark:text-[#E3E2E6] hover:text-[#B3261E] dark:hover:text-[#F2B8B5] border border-slate-300 dark:border-[#444746] text-xs font-semibold transition"
                title={t("登出系統")}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t("登出")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
