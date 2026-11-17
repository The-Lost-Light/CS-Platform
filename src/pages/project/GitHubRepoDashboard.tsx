import type { RepoBundle } from '../../domain/repository';
import { useState } from 'react';
import type { DiffMode } from '../../domain/diff';
import { RepositoryMetrics } from './github/RepositoryMetrics';
import { RepositoryLanguages } from './github/RepositoryLanguages';
import { RepositoryTree } from './github/RepositoryTree';
import { CommitHistory } from './github/CommitHistory';

export function GitHubRepoDashboard({ repoBundle }: { repoBundle: RepoBundle | null }) {
  const [selectedBranch, setSelectedBranch] = useState(
    repoBundle?.repo?.default_branch || 'main'
  );
  const [expandedCommitSha, setExpandedCommitSha] = useState(
    repoBundle?.commits?.[0]?.sha || null
  );
  const [diffMode, setDiffMode] = useState<DiffMode>('unified');
  const [fileTreeSearch, setFileTreeSearch] = useState('');

  if (!repoBundle || !repoBundle.repo) return null;

  const { repo, languages = {}, branches = [], commits = [], fileTree = [] } = repoBundle;

  return (
    <div className="space-y-6">
      {/* KPI Metrics Row */}
      <RepositoryMetrics repo={repo} branches={branches} fileTree={fileTree} />

      {/* Language Breakdown Bar */}
      <RepositoryLanguages languages={languages} />

      {/* Two-Column Explorer: Left = Actual GitHub File Tree (5 cols), Right = Commits & Code Diff Viewer (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Actual Repository File Structure Tree */}
      <RepositoryTree repo={repo} branches={branches} fileTree={fileTree} selectedBranch={selectedBranch} setSelectedBranch={setSelectedBranch} fileTreeSearch={fileTreeSearch} setFileTreeSearch={setFileTreeSearch} />

        {/* Right: Commit History & Code Diff Inspector */}
      <CommitHistory commits={commits} expandedCommitSha={expandedCommitSha} setExpandedCommitSha={setExpandedCommitSha} diffMode={diffMode} setDiffMode={setDiffMode} />
      </div>
    </div>
  );
}
