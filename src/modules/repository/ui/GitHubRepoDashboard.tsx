import { useState } from "react";

import type { DiffMode } from "../model/diff";
import type { RepoBundle } from "../model/repository";
import { CommitHistory } from "./CommitHistory";
import { RepositoryTree } from "./RepositoryTree";

interface BranchControl {
  onBranchChange: (branch: string) => void;
  isLoading?: boolean;
}

export function GitHubRepoDashboard({
  repoBundle,
  ...control
}: { repoBundle: RepoBundle | null } & BranchControl) {
  if (!repoBundle?.repo) return null;
  return (
    <LoadedGitHubRepoDashboard
      key={`${repoBundle.repo.full_name}:${repoBundle.commits[0]?.sha ?? ""}`}
      repoBundle={repoBundle}
      {...control}
    />
  );
}

function LoadedGitHubRepoDashboard({
  repoBundle,
  onBranchChange,
  isLoading,
}: { repoBundle: RepoBundle } & BranchControl) {
  const [expandedCommitSha, setExpandedCommitSha] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<DiffMode>("unified");
  const [fileTreeSearch, setFileTreeSearch] = useState("");

  const { repo, branches, tags, commits, fileTree } = repoBundle;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <RepositoryTree
        repo={repo}
        branches={branches}
        tags={tags}
        fileTree={fileTree}
        selectedBranch={repoBundle.selectedBranch}
        onBranchChange={onBranchChange}
        isLoading={isLoading}
        fileTreeSearch={fileTreeSearch}
        setFileTreeSearch={setFileTreeSearch}
      />
      <CommitHistory
        commits={commits}
        expandedCommitSha={expandedCommitSha}
        setExpandedCommitSha={setExpandedCommitSha}
        diffMode={diffMode}
        setDiffMode={setDiffMode}
      />
    </div>
  );
}
