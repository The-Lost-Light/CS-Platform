import { useI18n } from '../../i18n';
import type { RepoBundle } from '../../types';
import React, { useState } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  FolderTree,
  Star,
  GitFork,
  AlertCircle,
  Code2,
  ChevronDown,
  ChevronRight,
  FileCode2,
} from 'lucide-react';

export function GitHubRepoDashboard({ repoBundle }: { repoBundle: RepoBundle | null }) {
  const { t, locale } = useI18n();
  const [selectedBranch, setSelectedBranch] = useState(
    repoBundle?.repo?.default_branch || 'main'
  );
  const [expandedCommitSha, setExpandedCommitSha] = useState(
    repoBundle?.commits?.[0]?.sha || null
  );
  const [diffMode, setDiffMode] = useState('unified'); // 'unified' | 'split'
  const [fileTreeSearch, setFileTreeSearch] = useState('');

  if (!repoBundle || !repoBundle.repo) return null;

  const { repo, languages = {}, branches = [], commits = [], fileTree = [] } = repoBundle;

  const langEntries = Object.entries(languages as Record<string, number>).sort((a, b) => b[1] - a[1]);
  const totalBytes = langEntries.reduce((acc, [, b]) => acc + b, 0) || 1;

  const filteredTree = fileTree.filter((item) =>
    item.path.toLowerCase().includes(fileTreeSearch.trim().toLowerCase())
  );

  const parsePatch = (patchStr = '') => {
    return patchStr.split('\n').map((line, i) => {
      const type = line.startsWith('@@')
        ? 'hunk'
        : line.startsWith('+')
        ? 'add'
        : line.startsWith('-')
        ? 'del'
        : 'ctx';
      return { id: i, type, text: line };
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl p-3.5">
          <div className="text-xs text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t("Stars 星數")}</span>
            <Star className="w-3.5 h-3.5 text-[#B06000]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {repo.stargazers_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl p-3.5">
          <div className="text-xs text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t("Forks 分支數")}</span>
            <GitFork className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {repo.forks_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl p-3.5">
          <div className="text-xs text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t('未結案問題')}</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#C5221F]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {repo.open_issues_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl p-3.5">
          <div className="text-xs text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t("Branches 分支")}</span>
            <GitBranch className="w-3.5 h-3.5 text-[#137333]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {branches.length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl p-3.5">
          <div className="text-xs text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t("檔案總數")}</span>
            <FolderTree className="w-3.5 h-3.5 text-[#0B57D0]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {fileTree.length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl p-3.5">
          <div className="text-xs text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t("主要語言")}</span>
            <Code2 className="w-3.5 h-3.5 text-[#6750A4]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] mt-1 truncate">
            {repo.language || 'TypeScript'}
          </div>
        </div>
      </div>

      {/* Language Breakdown Bar */}
      {langEntries.length > 0 && (
        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-2xl p-4 space-y-2">
          <div className="text-xs font-semibold text-[#303030] dark:text-[#C4C7C5]">{t("GitHub 專案語言佔比 (Language Distribution)")}</div>
          <div className="w-full h-2.5 rounded-full bg-[#F0F4F9] dark:bg-[#282A2F] overflow-hidden flex">
            {langEntries.map(([lang, bytes], idx) => {
              const pct = Math.max(2, (bytes / totalBytes) * 100).toFixed(1);
              const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8'];
              return (
                <div
                  key={lang}
                  style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length] }}
                  title={`${lang}: ${pct}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[#444746] dark:text-[#C4C7C5] pt-1">
            {langEntries.map(([lang, bytes]) => (
              <span key={lang} className="font-mono">
                <strong className="text-[#1F1F1F] dark:text-[#E3E2E6]">{lang}</strong>:{' '}
                {((bytes / totalBytes) * 100).toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Two-Column Explorer: Left = Actual GitHub File Tree (5 cols), Right = Commits & Code Diff Viewer (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Actual Repository File Structure Tree */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#137333]" />
              <h3 className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t('GitHub 實際檔案結構樹（{count} 個檔案）', { count: fileTree.length })}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#F0F4F9] dark:bg-[#282A2F] font-mono text-[11px] text-[#0D652D]">
              {t('分支：')}{selectedBranch}
            </span>
          </div>

          <input
            type="text"
            value={fileTreeSearch}
            onChange={(e) => setFileTreeSearch(e.target.value)}
            placeholder={t("過濾 GitHub 倉庫內的檔案路徑...")}
            className="w-full px-3 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-200 dark:border-[#33353A] rounded-xl text-xs text-[#1F1F1F] dark:text-[#E3E2E6] font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="max-h-[460px] overflow-y-auto space-y-1 pr-1 font-mono text-xs">
            {filteredTree.map((item) => (
              <div
                key={item.path}
                className="px-3 py-1.5 rounded-lg bg-[#F8FAFD] dark:bg-[#121316] hover:bg-[#F0F4F9] dark:bg-[#282A2F]/80 border border-slate-200 dark:border-[#33353A] flex items-center justify-between gap-2 text-[#1F1F1F] dark:text-[#E3E2E6]"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 className="w-3.5 h-3.5 text-[#0B57D0] shrink-0" />
                  <span className="truncate">{item.path}</span>
                </div>
                {item.size !== undefined && (
                  <span className="text-[10px] text-[#5E5E5E] dark:text-[#8E918F] shrink-0">
                    {(item.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Branch Switcher, Commit History & Code Diff Inspector */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-2xl p-4 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#33353A] pb-3">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-[#0B57D0]" />
              <h3 className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t("Commit 開發紀錄與程式碼 Diff 檢視器")}</h3>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2.5 py-1 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-xs font-mono text-[#0B57D0]"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-lg bg-[#F0F4F9] dark:bg-[#282A2F] p-0.5 border border-slate-200 dark:border-[#33353A] text-[11px]">
                <button
                  type="button"
                  onClick={() => setDiffMode('unified')}
                  className={`px-2 py-0.5 rounded ${
                    diffMode === 'unified' ? 'bg-[#0B57D0] text-white' : 'text-[#444746] dark:text-[#C4C7C5]'
                  }`}
                >
                  {t('合併檢視')}
                </button>
                <button
                  type="button"
                  onClick={() => setDiffMode('split')}
                  className={`px-2 py-0.5 rounded ${
                    diffMode === 'split' ? 'bg-[#0B57D0] text-white' : 'text-[#444746] dark:text-[#C4C7C5]'
                  }`}
                >
                  {t('分割檢視')}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {commits.map((c) => {
              const isExpanded = expandedCommitSha === c.sha;
              const title = (c.commit?.message || '').split('\n')[0];
              const author = c.commit?.author?.name || c.author?.login || 'Developer';
              const commitDate = new Date(c.commit?.author?.date || '');
              const dateStr = Number.isNaN(commitDate.getTime()) ? '' : commitDate.toLocaleDateString(locale);

              return (
                <div
                  key={c.sha}
                  className="rounded-xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCommitSha(isExpanded ? null : c.sha)}
                    className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-white dark:bg-[#1E1F23] transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#D3E3FD] text-[#041E49] font-bold font-mono text-[11px]">
                          {c.sha.slice(0, 7)}
                        </span>
                        {c.prInfo?.merge_method_label && (
                          <span className="px-2 py-0.5 rounded bg-[#EADDFF] text-[#4F378B] font-bold text-[10px]">
                            {t(c.prInfo.merge_method_label)}
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#1F1F1F] dark:text-[#E3E2E6] truncate">{title}</span>
                      </div>
                      <div className="text-[11px] text-[#444746] dark:text-[#C4C7C5]">{t("作者：")}{author}{t(" · 日期：")}{dateStr}
                        {c.stats && (
                          <span className="ml-2 font-mono">
                            <span className="text-[#137333]">+{c.stats.additions}</span>{' '}
                            <span className="text-[#C5221F]">-{c.stats.deletions}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#444746] dark:text-[#C4C7C5] shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#444746] dark:text-[#C4C7C5] shrink-0" />
                    )}
                  </button>

                  {isExpanded && c.files && (
                    <div className="p-3 border-t border-slate-200 dark:border-[#33353A] space-y-2.5 bg-[#F0F4F9] dark:bg-[#282A2F]">
                      {c.files.map((f) => {
                        const lines = parsePatch(f.patch || '');
                        return (
                          <div
                            key={f.filename}
                            className="rounded-lg border border-slate-200 dark:border-[#33353A] overflow-hidden"
                          >
                            <div className="px-3 py-1.5 bg-white dark:bg-[#1E1F23] flex items-center justify-between text-xs font-mono">
                              <span className="text-[#1F1F1F] dark:text-[#E3E2E6] truncate">{f.filename}</span>
                              <span className="shrink-0">
                                <span className="text-[#137333]">+{f.additions}</span>{' '}
                                <span className="text-[#C5221F]">-{f.deletions}</span>
                              </span>
                            </div>
                            <div className="p-2 font-mono text-[11px] overflow-x-auto space-y-0.5">
                              {lines.map((l) => (
                                <div
                                  key={l.id}
                                  className={`px-2 py-0.5 whitespace-pre ${
                                    l.type === 'add'
                                      ? 'bg-emerald-500/15 text-[#0D652D] border-l-2 border-emerald-400'
                                      : l.type === 'del'
                                      ? 'bg-rose-500/15 text-[#B3261E] border-l-2 border-rose-400'
                                      : l.type === 'hunk'
                                      ? 'bg-[#D3E3FD] text-[#041E49] font-bold'
                                      : 'text-[#444746] dark:text-[#C4C7C5]'
                                  }`}
                                >
                                  {l.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
