import { useI18n } from '../../i18n';
import { isMessageKey, type MessageKey } from '../../i18n/messages';
import type { AdvancedProject, RepoBundle } from '../../types';
import { useState, useEffect, useRef } from 'react';
import { updateLocalizedProjectDraft } from '../../data/localizedAssignments';
import {
  FolderGit2,
  RefreshCw,
  KeyRound,
  Compass,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import { fetchGitHubProjectBundle } from '../../utils/githubService';
import { C4Architect } from './C4Architect';
import { migrateC4Nodes, type C4Relationship } from '../../utils/c4Model';
import { GitHubRepoDashboard } from './GitHubRepoDashboard';

export function AdvancedProjectWorkspace({
  project,
}: { project: AdvancedProject }) {
  const { t } = useI18n();
  const [repoUrlInput, setRepoUrlInput] = useState(
    project.defaultRepoUrl || 'https://github.com/student-team/course-oj-platform'
  );
  const [githubToken, setGithubToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [mindMapNodes, setMindMapNodes] = useState(() => migrateC4Nodes(project.initialMindMapNodes || []));
  const [relationships, setRelationships] = useState<C4Relationship[]>([]);
  const [designDoc, setDesignDoc] = useState(project.initialDesignDoc || '');
  const [repoBundle, setRepoBundle] = useState<RepoBundle | null>(null);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState<{ key: MessageKey } | { message: string } | null>(null);
  const previousProject = useRef(project);
  const [activeTab, setActiveTab] = useState<'design' | 'github'>('design');

  useEffect(() => {
    const previous = previousProject.current;
    previousProject.current = project;
    if (previous.id === project.id && previous !== project) {
      setMindMapNodes(nodes => {
        const localized = updateLocalizedProjectDraft(nodes, '', previous, project).nodes;
        return nodes.map((node, index) => ({ ...node, ...localized[index] }));
      });
      setDesignDoc(doc => updateLocalizedProjectDraft([], doc, previous, project).designDoc);
      return;
    }
    setRepoUrlInput(project.defaultRepoUrl);
    setMindMapNodes(migrateC4Nodes(project.initialMindMapNodes || []));
    setRelationships([]);
    setDesignDoc(project.initialDesignDoc || '');
    handleLoadRepo(project.defaultRepoUrl);
  }, [project]);

  const handleLoadRepo = async (targetUrl = repoUrlInput) => {
    setIsLoadingRepo(true);
    setRepoError(null);
    try {
      const bundle = await fetchGitHubProjectBundle(targetUrl, githubToken);
      setRepoBundle(bundle);
    } catch (err) {
      setRepoError(err instanceof Error
        ? isMessageKey(err.message) ? { key: err.message } : { message: err.message }
        : { key: 'workspace.errors.syncFailed' });
    } finally {
      setIsLoadingRepo(false);
    }
  };

  return (
    <div className="max-w-5xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Material Design 3 Project Overview & Segmented View Switcher Banner */}
      <section className="bg-white dark:bg-[#1E1F23] rounded-[24px] border border-slate-200/90 dark:border-[#33353A] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] flex items-center justify-center shadow-2xs shrink-0">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#EADDFF] dark:bg-[#4F378B] text-[#4F378B] dark:text-[#EADDFF] font-mono text-xs font-bold">
                {project.codeName}
              </span>
              <h1 className="text-base sm:text-xl font-bold text-[#1F1F1F] dark:text-[#E3E2E6] truncate">
                {project.title}
              </h1>
            </div>
            <p className="text-xs text-[#444746] dark:text-[#C4C7C5] mt-1 line-clamp-1">
              {project.summary}
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label={t('workspace.tabs.design')}
          className="inline-flex items-center gap-1 bg-[#F0F4F9] dark:bg-[#121316] p-1 rounded-full border border-slate-200 dark:border-[#33353A] self-start sm:self-auto shrink-0"
        >
          {(['design', 'github'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`workspace-tab-${tab}`}
              aria-controls={`workspace-panel-${tab}`}
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                activeTab === tab
                  ? tab === 'design'
                    ? 'bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] shadow-2xs'
                    : 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] shadow-2xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-white dark:hover:bg-[#282A2F] hover:text-[#1F1F1F] dark:hover:text-[#E3E2E6]'
              }`}
            >
              {tab === 'design' ? (
                <Compass className="w-3.5 h-3.5" />
              ) : (
                <GitBranch className="w-3.5 h-3.5" />
              )}
              <span>{t(tab === 'design' ? 'workspace.tabs.design' : 'workspace.tabs.github')}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Step 1: Mind Map & Written Architecture Design */}
      <div role="tabpanel" id="workspace-panel-design" aria-labelledby="workspace-tab-design" hidden={activeTab !== 'design'}>
        <C4Architect
          key={project.id}
          relationships={relationships}
          onChangeRelationships={setRelationships}
          nodes={mindMapNodes}
          onChangeNodes={setMindMapNodes}
          designDoc={designDoc}
          onChangeDesignDoc={setDesignDoc}
        />
      </div>

      {/* Step 2: GitHub Repository Explorer */}
      <div role="tabpanel" id="workspace-panel-github" aria-labelledby="workspace-tab-github" className="space-y-6" hidden={activeTab !== 'github'}>
        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="px-3.5 py-1.5 rounded-full bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] dark:hover:bg-[#004A77] text-[#1F1F1F] dark:text-[#E3E2E6] hover:text-[#041E49] dark:hover:text-[#C2E7FF] border border-slate-200 dark:border-[#33353A] text-xs font-semibold inline-flex items-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#B06000] dark:text-[#FDD663]" />
              <span>{t('workspace.githubToken')}</span>
            </button>
          </div>

          {showTokenInput && (
            <div className="p-3.5 rounded-2xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
              <span className="font-semibold text-[#444746] dark:text-[#C4C7C5] shrink-0">Personal Access Token:</span>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder={t('workspace.tokenPlaceholder')}
                className="flex-1 px-3 py-2 bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl text-[#1F1F1F] dark:text-[#E3E2E6] font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0] dark:focus:ring-[#A8C7FA]"
              />
            </div>
          )}

          {/* GitHub Repo URL Search Bar & Presets */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLoadRepo(repoUrlInput);
            }}
            className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-1"
          >
            <div className="relative flex-1">
              <FolderGit2 className="w-4 h-4 text-[#6750A4] dark:text-[#D0BCFF] absolute left-3.5 top-3" />
              <input
                type="text"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                placeholder={t('workspace.repoPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-xl text-xs sm:text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-mono focus:outline-hidden focus:ring-2 focus:ring-[#6750A4] dark:focus:ring-[#D0BCFF] transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoadingRepo}
              className="px-5 py-2.5 rounded-xl bg-[#6750A4] hover:bg-[#4F378B] dark:bg-[#D0BCFF] dark:hover:bg-[#EADDFF] text-white dark:text-[#381E72] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRepo ? 'animate-spin' : ''}`} />
              <span>{t('workspace.sync')}</span>
            </button>
          </form>

          {repoError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[#FAD2CF] dark:bg-[#8C1D18]/40 border border-[#F28B82] dark:border-[#8C1D18] text-[#B3261E] dark:text-[#F2B8B5] text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{'key' in repoError ? t(repoError.key) : repoError.message}</span>
            </div>
          )}

          {/* Quick Repo Preset Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#444746] dark:text-[#C4C7C5] pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{t('workspace.sampleRepos')}</span>
              <button
                type="button"
                onClick={() => {
                  const u = 'https://github.com/student-team/course-oj-platform';
                  setRepoUrlInput(u);
                  handleLoadRepo(u);
                }}
                className="px-3 py-1 rounded-full bg-[#F3EDF7] dark:bg-[#4F378B]/40 hover:bg-[#EADDFF] dark:hover:bg-[#4F378B]/70 text-[#4F378B] dark:text-[#EADDFF] border border-[#EADDFF] dark:border-[#6750A4]/50 font-mono font-semibold transition"
              >
                {t('workspace.studentRepo')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = 'https://github.com/facebook/react';
                  setRepoUrlInput(u);
                  handleLoadRepo(u);
                }}
                className="px-3 py-1 rounded-full bg-[#D3E3FD]/60 dark:bg-[#004A77]/40 hover:bg-[#D3E3FD] dark:hover:bg-[#004A77]/70 text-[#041E49] dark:text-[#C2E7FF] border border-[#A8C7FA] dark:border-[#004A77] font-mono font-semibold transition"
              >
                facebook/react
              </button>
            </div>
          </div>
        </div>
        <GitHubRepoDashboard repoBundle={repoBundle} />
      </div>
    </div>
  );
}
