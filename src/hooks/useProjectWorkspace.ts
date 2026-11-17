import { useState } from 'react';
import type { Project } from '../domain/project';
import { fetchGitHubProjectBundle, type GitHubProjectLoader } from '../services/github';
import { useProjectDraft } from './useProjectDraft';
import { useRepository } from './useRepository';

/** Compose draft and repository lifecycles without coupling either hook to a page. */
export function useProjectWorkspace(project: Project, loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle) {
  const repository = useRepository(project.defaultRepoUrl, loadRepository);
  const draft = useProjectDraft(project, (url) => {
    repository.setRepoUrlInput(url);
    void repository.handleLoadRepo(url);
  });
  const [activeTab, setActiveTab] = useState<'design' | 'github'>('design');
  return { ...repository, ...draft, activeTab, setActiveTab };
}
