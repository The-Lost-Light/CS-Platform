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

const LANG_CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

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
        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t('github.stars')}</span>
            <Star className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">
            {repo.stargazers_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t('github.forks')}</span>
            <GitFork className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">
            {repo.forks_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t('github.openIssues')}</span>
            <AlertCircle className="w-3.5 h-3.5 text-danger" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">
            {repo.open_issues_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t('github.branches')}</span>
            <GitBranch className="w-3.5 h-3.5 text-success" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">
            {branches.length}
          </div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t('github.totalFiles')}</span>
            <FolderTree className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">
            {fileTree.length}
          </div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t('github.primaryLanguage')}</span>
            <Code2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-lg font-bold text-on-surface mt-1 truncate">
            {repo.language || 'TypeScript'}
          </div>
        </div>
      </div>

      {/* Language Breakdown Bar */}
      {langEntries.length > 0 && (
        <div className="ui-card p-5 space-y-2.5">
          <div className="text-xs font-bold text-on-surface">{t('github.languageDistribution')}</div>
          <div className="w-full h-2.5 rounded-full bg-surface-high overflow-hidden flex">
            {langEntries.map(([lang, bytes], idx) => {
              const pct = Math.max(2, (bytes / totalBytes) * 100).toFixed(1);
              return (
                <div
                  key={lang}
                  style={{ width: `${pct}%`, backgroundColor: LANG_CHART_COLORS[idx % LANG_CHART_COLORS.length] }}
                  title={`${lang}: ${pct}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-on-muted pt-1">
            {langEntries.map(([lang, bytes]) => (
              <span key={lang} className="font-mono">
                <strong className="text-on-surface">{lang}</strong>:{' '}
                {((bytes / totalBytes) * 100).toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Two-Column Explorer: Left = Actual GitHub File Tree (5 cols), Right = Commits & Code Diff Viewer (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Actual Repository File Structure Tree */}
        <div className="lg:col-span-5 ui-card p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-success" />
              <h3 className="text-sm font-bold text-on-surface">
                {t('github.fileTree', { count: fileTree.length })}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-success-container font-mono text-[11px] font-bold text-on-success-container">
              {t('github.branchLabel')}{selectedBranch}
            </span>
          </div>

          <input
            type="text"
            value={fileTreeSearch}
            onChange={(e) => setFileTreeSearch(e.target.value)}
            placeholder={t('github.filterPaths')}
            className="ui-input font-mono text-xs"
          />

          <div className="max-h-[460px] overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
            {filteredTree.map((item) => (
              <div
                key={item.path}
                className="px-3 py-2 rounded-xl bg-surface-sunken hover:bg-surface-hover border border-outline flex items-center justify-between gap-2 text-on-surface transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span className="truncate">{item.path}</span>
                </div>
                {item.size !== undefined && (
                  <span className="text-[10px] text-on-subtle shrink-0">
                    {(item.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Branch Switcher, Commit History & Code Diff Inspector */}
        <div className="lg:col-span-7 ui-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline pb-3.5">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-secondary" />
              <h3 className="text-sm font-bold text-on-surface">{t('github.commitHistory')}</h3>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1 bg-surface-container border border-outline rounded-full text-xs font-mono font-bold text-secondary focus:outline-hidden focus:ring-2 focus:ring-secondary"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div className="ui-pill-group text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setDiffMode('unified')}
                  className={`px-2.5 py-0.5 rounded-full transition ${
                    diffMode === 'unified'
                      ? 'bg-secondary text-on-secondary shadow-2xs'
                      : 'text-on-muted'
                  }`}
                >
                  {t('github.diff.unified')}
                </button>
                <button
                  type="button"
                  onClick={() => setDiffMode('split')}
                  className={`px-2.5 py-0.5 rounded-full transition ${
                    diffMode === 'split'
                      ? 'bg-secondary text-on-secondary shadow-2xs'
                      : 'text-on-muted'
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
                  className="ui-panel overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCommitSha(isExpanded ? null : c.sha)}
                    className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-surface-hover transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container font-bold font-mono text-[11px]">
                          {c.sha.slice(0, 7)}
                        </span>
                        {c.prInfo?.merge_method_key && (
                          <span className="px-2 py-0.5 rounded-md bg-primary-container text-on-primary-container font-bold text-[10px]">
                            {t(c.prInfo.merge_method_key)}
                          </span>
                        )}
                        <span className="text-xs font-bold text-on-surface truncate">{title}</span>
                      </div>
                      <div className="text-[11px] text-on-muted">
                        {t('github.authorLabel')}{author}{t('github.dateLabel')}{dateStr}
                        {c.stats && (
                          <span className="ml-2 font-mono">
                            <span className="text-success">+{c.stats.additions}</span>{' '}
                            <span className="text-danger">-{c.stats.deletions}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-on-muted shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-on-muted shrink-0" />
                    )}
                  </button>

                  {isExpanded && c.files && (
                    <div className="p-3 border-t border-outline space-y-2.5 bg-surface-high">
                      {c.files.map((f) => {
                        const lines = parsePatch(f.patch || '');
                        return (
                          <div
                            key={f.filename}
                            className="rounded-xl border border-outline overflow-hidden bg-surface"
                          >
                            <div className="px-3 py-1.5 bg-surface-sunken border-b border-outline flex items-center justify-between text-xs font-mono">
                              <span className="text-on-surface truncate">{f.filename}</span>
                              <span className="shrink-0">
                                <span className="text-success">+{f.additions}</span>{' '}
                                <span className="text-danger">-{f.deletions}</span>
                              </span>
                            </div>
                            <div className="p-2 font-mono text-[11px] overflow-x-auto space-y-0.5">
                              {lines.map((l) => (
                                <div
                                  key={l.id}
                                  className={`px-2 py-0.5 rounded-xs whitespace-pre ${
                                    l.type === 'add'
                                      ? 'bg-success-container/60 text-on-success-container border-l-2 border-success'
                                      : l.type === 'del'
                                      ? 'bg-danger-container/60 text-on-danger-container border-l-2 border-danger'
                                      : l.type === 'hunk'
                                      ? 'bg-secondary-container text-on-secondary-container font-bold'
                                      : 'text-on-muted'
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
