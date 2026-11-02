import { useI18n } from '../../i18n';
import type { BasicAssignment, AdvancedProject, ChangeStats, User } from '../../types';
import {
  Terminal,
  FolderGit2,
  ChevronRight,
} from 'lucide-react';

export function HomeDashboard({
  basicAssignments,
  advancedProjects,
  onOpenAssignment,
  changeStatsByAssignment = {},
  currentUser,
}: { basicAssignments: BasicAssignment[]; advancedProjects: AdvancedProject[]; onOpenAssignment: (item: BasicAssignment | AdvancedProject) => void; changeStatsByAssignment?: Record<string, ChangeStats>; currentUser: User }) {
  const { t } = useI18n();
  const totalChanges = Object.values(changeStatsByAssignment).reduce(
    (acc, s) => acc + (s?.total || 0),
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Simple Material 3 Dashboard Overview Header */}
      <section className="bg-white dark:bg-[#1E1F23] rounded-[24px] border border-slate-200/90 dark:border-[#33353A] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="inline-block px-3 py-0.5 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] text-xs font-semibold mb-1.5">{t("作業總覽儀表板 (Dashboard)")}</span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t("歡迎回來，")}{currentUser?.name || t("同學")}
          </h1>
          <p className="text-xs sm:text-sm text-[#444746] dark:text-[#C4C7C5] mt-0.5">{t("請選擇下方「基礎作業」或「進階作業（專題）」標題進入作答區")}</p>
        </div>

        {/* Compact Summary Counters */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] text-center">
            <div className="text-lg font-bold text-[#137333] dark:text-[#81C995] font-mono">
              {basicAssignments.length}
            </div>
            <div className="text-[11px] font-medium text-[#444746] dark:text-[#C4C7C5]">{t("基礎題")}</div>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] text-center">
            <div className="text-lg font-bold text-[#6750A4] dark:text-[#D0BCFF] font-mono">
              {advancedProjects.length}
            </div>
            <div className="text-[11px] font-medium text-[#444746] dark:text-[#C4C7C5]">{t("進階專題")}</div>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] text-center">
            <div className="text-lg font-bold text-[#0B57D0] dark:text-[#A8C7FA] font-mono">
              {totalChanges}
            </div>
            <div className="text-[11px] font-medium text-[#444746] dark:text-[#C4C7C5]">{t("編輯紀錄")}</div>
          </div>
        </div>
      </section>

      {/* Two Clean Material Blocks: Basic Assignments vs. Advanced Projects (Only Titles Shown) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Block 1: Basic Assignments (基礎題區塊) */}
        <section className="bg-white dark:bg-[#1E1F23] rounded-[24px] border border-slate-200/90 dark:border-[#33353A] shadow-xs overflow-hidden transition-colors">
          <div className="px-6 py-4 bg-[#E6F4EA] dark:bg-[#0F5223]/50 border-b border-[#CEEAD6] dark:border-[#137333]/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#137333] dark:bg-[#81C995] text-white dark:text-[#072711] flex items-center justify-center shadow-2xs">
                <Terminal className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#0D652D] dark:text-[#C4EED0]">{t("基礎作業 (Python 程式題)")}</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-[#121316] text-[#137333] dark:text-[#81C995] font-mono text-xs font-bold border border-[#CEEAD6] dark:border-[#137333]">
              {t('題數：{count}', { count: basicAssignments.length })}</span>
          </div>

          <div className="divide-y divide-slate-200/80 dark:divide-[#33353A]">
            {basicAssignments.map((hw) => (
              <button
                key={hw.id}
                type="button"
                onClick={() => onOpenAssignment(hw)}
                className="w-full px-6 py-4 text-left bg-white dark:bg-[#1E1F23] hover:bg-[#F0F4F9] dark:hover:bg-[#282A2F] flex items-center justify-between gap-3 group transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg bg-[#CEEAD6] dark:bg-[#0F5223] text-[#0D652D] dark:text-[#C4EED0] font-mono text-xs font-bold shrink-0">
                    {hw.codeName}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#1F1F1F] dark:text-[#E3E2E6] group-hover:text-[#0B57D0] dark:group-hover:text-[#A8C7FA] truncate transition">
                    {hw.title}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0B57D0] dark:group-hover:text-[#A8C7FA] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* Block 2: Advanced Projects (進階題 / 專題區塊) */}
        <section className="bg-white dark:bg-[#1E1F23] rounded-[24px] border border-slate-200/90 dark:border-[#33353A] shadow-xs overflow-hidden transition-colors">
          <div className="px-6 py-4 bg-[#F3EDF7] dark:bg-[#4F378B]/40 border-b border-[#EADDFF] dark:border-[#6750A4]/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] flex items-center justify-center shadow-2xs">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#4F378B] dark:text-[#EADDFF]">{t("進階作業 (GitHub 專題架構)")}</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-[#121316] text-[#6750A4] dark:text-[#D0BCFF] font-mono text-xs font-bold border border-[#EADDFF] dark:border-[#6750A4]">
              {t('專題數：{count}', { count: advancedProjects.length })}</span>
          </div>

          <div className="divide-y divide-slate-200/80 dark:divide-[#33353A]">
            {advancedProjects.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => onOpenAssignment(proj)}
                className="w-full px-6 py-4 text-left bg-white dark:bg-[#1E1F23] hover:bg-[#F3EDF7]/60 dark:hover:bg-[#282A2F] flex items-center justify-between gap-3 group transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg bg-[#EADDFF] dark:bg-[#4F378B] text-[#4F378B] dark:text-[#EADDFF] font-mono text-xs font-bold shrink-0">
                    {proj.codeName}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#1F1F1F] dark:text-[#E3E2E6] group-hover:text-[#6750A4] dark:group-hover:text-[#D0BCFF] truncate transition">
                    {proj.title}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#6750A4] dark:group-hover:text-[#D0BCFF] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
