import type { DiffMode } from "../model/diff";
import type { RepoBundle } from "../model/repository";
import { CommitHistory } from "./CommitHistory";
import { RepositoryLanguages } from "./RepositoryLanguages";
import { RepositoryMetrics } from "./RepositoryMetrics";
import { RepositoryTree } from "./RepositoryTree";
import { useState } from "react";

export function GitHubRepoDashboard({ repoBundle }: { repoBundle: RepoBundle | null }) {
  if (!repoBundle?.repo) return null;
  return (
    <LoadedGitHubRepoDashboard
      key={`${repoBundle.repo.full_name}:${repoBundle.commits[0]?.sha ?? ""}`}
      repoBundle={repoBundle}
    />
  );
}

function LoadedGitHubRepoDashboard({ repoBundle }: { repoBundle: RepoBundle }) {
  const [selectedBranch, setSelectedBranch] = useState(repoBundle?.repo?.default_branch || "main");
  const [expandedCommitSha, setExpandedCommitSha] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<DiffMode>("unified");
  const [fileTreeSearch, setFileTreeSearch] = useState("");

  const { repo, languages, branches, commits, fileTree } = repoBundle;

  return (
    <div className="space-y-6">
      <RepositoryMetrics repo={repo} branches={branches} fileTree={fileTree} />
      <RepositoryLanguages languages={languages} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <RepositoryTree
          repo={repo}
          branches={branches}
          fileTree={fileTree}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
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
    </div>
  );
}
