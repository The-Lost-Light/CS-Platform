import { useI18n } from '../../i18n';
import type { RepoBundle } from '../../types';
import { useState } from 'react';
import {
  GitBranch,
  GitCommit,
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
        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-2xl p-4 shadow-xs transition-colors">
          <div className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t('github.stars')}</span>
            <Star className="w-3.5 h-3.5 text-[#B06000] dark:text-[#FDD663]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {repo.stargazers_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-2xl p-4 shadow-xs transition-colors">
          <div className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t('github.forks')}</span>
            <GitFork className="w-3.5 h-3.5 text-[#0B57D0] dark:text-[#A8C7FA]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {repo.forks_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-2xl p-4 shadow-xs transition-colors">
          <div className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t('github.openIssues')}</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#C5221F] dark:text-[#F2B8B5]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {repo.open_issues_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-2xl p-4 shadow-xs transition-colors">
          <div className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t('github.branches')}</span>
            <GitBranch className="w-3.5 h-3.5 text-[#137333] dark:text-[#81C995]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {branches.length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-2xl p-4 shadow-xs transition-colors">
          <div className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t('github.totalFiles')}</span>
            <FolderTree className="w-3.5 h-3.5 text-[#0B57D0] dark:text-[#A8C7FA]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono mt-1">
            {fileTree.length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-2xl p-4 shadow-xs transition-colors">
          <div className="text-xs font-medium text-[#444746] dark:text-[#C4C7C5] flex items-center justify-between">
            <span>{t('github.primaryLanguage')}</span>
            <Code2 className="w-3.5 h-3.5 text-[#6750A4] dark:text-[#D0BCFF]" />
          </div>
          <div className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6] mt-1 truncate">
            {repo.language || 'TypeScript'}
          </div>
        </div>
      </div>

      {/* Language Breakdown Bar */}
      {langEntries.length > 0 && (
        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] p-5 space-y-2.5 shadow-xs transition-colors">
          <div className="text-xs font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t('github.languageDistribution')}</div>
          <div className="w-full h-2.5 rounded-full bg-[#F0F4F9] dark:bg-[#282A2F] overflow-hidden flex">
            {langEntries.map(([lang, bytes], idx) => {
              const pct = Math.max(2, (bytes / totalBytes) * 100).toFixed(1);
              const colors = ['#0B57D0', '#6750A4', '#137333', '#B06000', '#006A60'];
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
        <div className="lg:col-span-5 bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] p-5 space-y-3.5 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#137333] dark:text-[#81C995]" />
              <h3 className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">
                {t('github.fileTree', { count: fileTree.length })}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#CEEAD6] dark:bg-[#0F5223]/50 font-mono text-[11px] font-bold text-[#0D652D] dark:text-[#C4EED0]">
              {t('github.branchLabel')}{selectedBranch}
            </span>
          </div>

          <input
            type="text"
            value={fileTreeSearch}
            onChange={(e) => setFileTreeSearch(e.target.value)}
            placeholder={t('github.filterPaths')}
            className="w-full px-3.5 py-2 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-xl text-xs text-[#1F1F1F] dark:text-[#E3E2E6] font-mono placeholder-[#5E5E5E] dark:placeholder-[#8E918F] focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0] dark:focus:ring-[#A8C7FA] transition"
          />

          <div className="max-h-[460px] overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
            {filteredTree.map((item) => (
              <div
                key={item.path}
                className="px-3 py-2 rounded-xl bg-[#F8FAFD] dark:bg-[#121316] hover:bg-[#F3EDF7]/60 dark:hover:bg-[#282A2F] border border-slate-200/80 dark:border-[#33353A] flex items-center justify-between gap-2 text-[#1F1F1F] dark:text-[#E3E2E6] transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 className="w-3.5 h-3.5 text-[#0B57D0] dark:text-[#A8C7FA] shrink-0" />
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
        <div className="lg:col-span-7 bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] p-5 space-y-4 shadow-xs transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#33353A] pb-3.5">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
              <h3 className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t('github.commitHistory')}</h3>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1 bg-[#F0F4F9] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-full text-xs font-mono font-bold text-[#0B57D0] dark:text-[#A8C7FA] focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0] dark:focus:ring-[#A8C7FA]"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-full bg-[#F0F4F9] dark:bg-[#121316] p-1 border border-slate-200 dark:border-[#33353A] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setDiffMode('unified')}
                  className={`px-2.5 py-0.5 rounded-full transition ${
                    diffMode === 'unified'
                      ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] shadow-2xs'
                      : 'text-[#444746] dark:text-[#C4C7C5]'
                  }`}
                >
                  {t('github.diff.unified')}
                </button>
                <button
                  type="button"
                  onClick={() => setDiffMode('split')}
                  className={`px-2.5 py-0.5 rounded-full transition ${
                    diffMode === 'split'
                      ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] shadow-2xs'
                      : 'text-[#444746] dark:text-[#C4C7C5]'
                  }`}
                >
                  {t('github.diff.split')}
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
                  className="rounded-2xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCommitSha(isExpanded ? null : c.sha)}
                    className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-[#F3EDF7]/50 dark:hover:bg-[#282A2F] transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] font-bold font-mono text-[11px]">
                          {c.sha.slice(0, 7)}
                        </span>
                        {c.prInfo?.merge_method_key && (
                          <span className="px-2 py-0.5 rounded-md bg-[#EADDFF] dark:bg-[#4F378B] text-[#4F378B] dark:text-[#EADDFF] font-bold text-[10px]">
                            {t(c.prInfo.merge_method_key)}
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#1F1F1F] dark:text-[#E3E2E6] truncate">{title}</span>
                      </div>
                      <div className="text-[11px] text-[#444746] dark:text-[#C4C7C5]">
                        {t('github.authorLabel')}{author}{t('github.dateLabel')}{dateStr}
                        {c.stats && (
                          <span className="ml-2 font-mono">
                            <span className="text-[#137333] dark:text-[#81C995]">+{c.stats.additions}</span>{' '}
                            <span className="text-[#C5221F] dark:text-[#F2B8B5]">-{c.stats.deletions}</span>
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
                            className="rounded-xl border border-slate-200 dark:border-[#33353A] overflow-hidden bg-white dark:bg-[#1E1F23]"
                          >
                            <div className="px-3 py-1.5 bg-[#F8FAFD] dark:bg-[#121316] border-b border-slate-200 dark:border-[#33353A] flex items-center justify-between text-xs font-mono">
                              <span className="text-[#1F1F1F] dark:text-[#E3E2E6] truncate">{f.filename}</span>
                              <span className="shrink-0">
                                <span className="text-[#137333] dark:text-[#81C995]">+{f.additions}</span>{' '}
                                <span className="text-[#C5221F] dark:text-[#F2B8B5]">-{f.deletions}</span>
                              </span>
                            </div>
                            <div className="p-2 font-mono text-[11px] overflow-x-auto space-y-0.5">
                              {lines.map((l) => (
                                <div
                                  key={l.id}
                                  className={`px-2 py-0.5 rounded-xs whitespace-pre ${
                                    l.type === 'add'
                                      ? 'bg-[#CEEAD6]/60 dark:bg-[#0F5223]/40 text-[#0D652D] dark:text-[#C4EED0] border-l-2 border-[#137333]'
                                      : l.type === 'del'
                                      ? 'bg-[#FAD2CF]/60 dark:bg-[#8C1D18]/40 text-[#B3261E] dark:text-[#F2B8B5] border-l-2 border-[#C5221F]'
                                      : l.type === 'hunk'
                                      ? 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] font-bold'
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
