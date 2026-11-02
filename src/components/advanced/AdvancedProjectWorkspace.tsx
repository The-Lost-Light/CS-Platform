import { useI18n } from '../../i18n';
import { isMessageKey, type MessageKey } from '../../i18n/messages';
import type { AdvancedProject, RepoBundle } from '../../types';
import { useState, useEffect, useRef } from 'react';
import { updateLocalizedProjectDraft } from '../../data/localizedAssignments';
import {
  ArrowLeft,
  FolderGit2,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { fetchGitHubProjectBundle } from '../../utils/githubService';
import { C4Architect } from './C4Architect';
import { migrateC4Nodes, type C4Relationship } from '../../utils/c4Model';
import { GitHubRepoDashboard } from './GitHubRepoDashboard';

export function AdvancedProjectWorkspace({
  project,
  allAdvancedProjects = [],
  onSelectProject,
  onBackHome,
}: { project: AdvancedProject; allAdvancedProjects?: AdvancedProject[]; onSelectProject: (project: AdvancedProject) => void; onBackHome: () => void }) {
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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      {/* Top Bar: Project Switcher & GitHub Repo URL Input */}
      <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] text-[#1F1F1F] dark:text-[#E3E2E6] text-xs font-medium border border-slate-300 dark:border-[#444746] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('common.backHome')}</span>
            </button>

            {allAdvancedProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProject(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                  p.id === project.id
                    ? 'bg-[#6750A4] text-white shadow-md shadow-purple-600/25'
                    : 'bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#F0F4F9] dark:bg-[#282A2F] text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:text-[#E3E2E6] border border-slate-200 dark:border-[#33353A]'
                }`}
              >
                {p.codeName}: {p.title.slice(0, 16)}…
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="px-3 py-1.5 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] text-[#1F1F1F] dark:text-[#E3E2E6] border border-slate-300 dark:border-[#444746] text-xs font-medium inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#B06000]" />
              <span>{t('workspace.githubToken')}</span>
            </button>
          </div>
        </div>

        {showTokenInput && (
          <div className="p-3 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-200 dark:border-[#33353A] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
            <span className="text-[#444746] dark:text-[#C4C7C5] shrink-0">Personal Access Token:</span>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder={t('workspace.tokenPlaceholder')}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-[#1E1F23] border border-slate-300 dark:border-[#444746] rounded-lg text-[#1F1F1F] dark:text-[#E3E2E6] font-mono"
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
            <FolderGit2 className="w-4 h-4 text-[#6750A4] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={repoUrlInput}
              onChange={(e) => setRepoUrlInput(e.target.value)}
              placeholder={t('workspace.repoPlaceholder')}
              className="w-full pl-10 pr-4 py-2 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-xl text-xs sm:text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoadingRepo}
            className="px-5 py-2 rounded-xl bg-[#6750A4] hover:bg-[#4F378B] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs shadow-purple-600/25 transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingRepo ? 'animate-spin' : ''}`} />
            <span>{t('workspace.sync')}</span>
          </button>
        </form>

        {repoError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{'key' in repoError ? t(repoError.key) : repoError.message}</p>}
        {/* Quick Repo Preset Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#444746] dark:text-[#C4C7C5] pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>{t('workspace.sampleRepos')}</span>
            <button
              type="button"
              onClick={() => {
                const u = 'https://github.com/student-team/course-oj-platform';
                setRepoUrlInput(u);
                handleLoadRepo(u);
              }}
              className="px-2.5 py-1 rounded-md bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#EADDFF]/60 text-[#6750A4] border border-purple-500/30 font-mono"
            >{t('workspace.studentRepo')}</button>
            <button
              type="button"
              onClick={() => {
                const u = 'https://github.com/facebook/react';
                setRepoUrlInput(u);
                handleLoadRepo(u);
              }}
              className="px-2.5 py-1 rounded-md bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD]/50 text-[#0B57D0] border border-indigo-500/30 font-mono"
            >
              facebook/react
            </button>
          </div>

        </div>
      </div>
      <div role="tablist" aria-label={t('workspace.tabs.design')} className="flex gap-2 border-b border-slate-200 dark:border-[#33353A]">
        {(['design', 'github'] as const).map(tab => <button key={tab} type="button" role="tab"
          id={`workspace-tab-${tab}`} aria-controls={`workspace-panel-${tab}`} aria-selected={activeTab === tab}
          onClick={() => setActiveTab(tab)}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === tab ? 'border-[#6750A4] text-[#6750A4] dark:text-[#D0BCFF]' : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282A2F]'}`}>
          {t(tab === 'design' ? 'workspace.tabs.design' : 'workspace.tabs.github')}
        </button>)}
      </div>
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
      <div role="tabpanel" id="workspace-panel-github" aria-labelledby="workspace-tab-github" hidden={activeTab !== 'github'}>
        <GitHubRepoDashboard repoBundle={repoBundle} />
      </div>
    </div>
  );
}
