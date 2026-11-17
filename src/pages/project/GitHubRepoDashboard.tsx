import type { RepoBundle } from "@domain/repository";
import { useState } from "react";
import type { DiffMode } from "@domain/diff";
import { RepositoryMetrics } from "@pages/project/github/RepositoryMetrics";
import { RepositoryLanguages } from "@pages/project/github/RepositoryLanguages";
import { RepositoryTree } from "@pages/project/github/RepositoryTree";
import { CommitHistory } from "@pages/project/github/CommitHistory";

export function GitHubRepoDashboard({
  repoBundle,
}: {
  repoBundle: RepoBundle | null;
}) {
  if (!repoBundle?.repo) return null;
  return (
    <LoadedGitHubRepoDashboard
      key={`${repoBundle.repo.full_name}:${repoBundle.commits[0]?.sha ?? ""}`}
      repoBundle={repoBundle}
    />
  );
}

function LoadedGitHubRepoDashboard({ repoBundle }: { repoBundle: RepoBundle }) {
  const [selectedBranch, setSelectedBranch] = useState(
    repoBundle?.repo?.default_branch || "main",
  );
  const [expandedCommitSha, setExpandedCommitSha] = useState<string | null>(
    null,
  );
  const [diffMode, setDiffMode] = useState<DiffMode>("unified");
  const [fileTreeSearch, setFileTreeSearch] = useState("");

  const {
    repo,
    languages = {},
    branches = [],
    commits = [],
    fileTree = [],
  } = repoBundle;

  return (
    <div className="space-y-6">
      {/* KPI Metrics Row */}
      <RepositoryMetrics repo={repo} branches={branches} fileTree={fileTree} />

      {/* Language Breakdown Bar */}
      <RepositoryLanguages languages={languages} />

      {/* Two-Column Explorer: Left = Actual GitHub File Tree (5 cols), Right = Commits & Code Diff Viewer (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Actual Repository File Structure Tree */}
        <RepositoryTree
          repo={repo}
          branches={branches}
          fileTree={fileTree}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          fileTreeSearch={fileTreeSearch}
          setFileTreeSearch={setFileTreeSearch}
        />

        {/* Right: Commit History & Code Diff Inspector */}
        <CommitHistory
          commits={commits}
          expandedCommitSha={expandedCommitSha}
          setExpandedCommitSha={setExpandedCommitSha}
          diffMode={diffMode}
          setDiffMode={setDiffMode}
        />
      </div>
    </div>
  );
}
