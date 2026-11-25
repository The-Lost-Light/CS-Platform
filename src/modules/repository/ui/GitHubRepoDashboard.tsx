import { useRef, useState, type RefObject } from "react";

import { useBranchPagination, useRepoCommitList } from "../hooks/useRepoDashboard";
import type { RepoBundle, RepoCommitDetails } from "../model/repository";
import {
  fetchGitHubBranchesPage,
  fetchGitHubCommitDetails,
  fetchGitHubCommitsPage,
  type GitHubBranchesPageLoader,
  type GitHubCommitDetailsLoader,
  type GitHubCommitsPageLoader,
} from "../services/github";
import { CommitHistory } from "./CommitHistory";
import { RepositoryTree } from "./RepositoryTree";

interface BranchControl {
  onBranchChange: (branch: string) => void;
  isLoading?: boolean;
  loadBranchesPage?: GitHubBranchesPageLoader;
  loadCommitDetails?: GitHubCommitDetailsLoader;
  loadCommitsPage?: GitHubCommitsPageLoader;
}

export function GitHubRepoDashboard({
  repoBundle,
  loadBranchesPage = fetchGitHubBranchesPage,
  loadCommitDetails = fetchGitHubCommitDetails,
  loadCommitsPage = fetchGitHubCommitsPage,
  ...control
}: { repoBundle: RepoBundle | null } & BranchControl) {
  const detailsCacheRef = useRef(new Map<string, RepoCommitDetails>());
  if (!repoBundle?.repo) return null;

  return (
    <GitHubRepoDashboardContent
      repoBundle={repoBundle}
      detailsCacheRef={detailsCacheRef}
      loadBranchesPage={loadBranchesPage}
      loadCommitDetails={loadCommitDetails}
      loadCommitsPage={loadCommitsPage}
      {...control}
    />
  );
}

function GitHubRepoDashboardContent({
  repoBundle,
  detailsCacheRef,
  loadBranchesPage,
  loadCommitDetails,
  loadCommitsPage,
  ...control
}: {
  repoBundle: RepoBundle;
  detailsCacheRef: RefObject<Map<string, RepoCommitDetails>>;
  loadBranchesPage: GitHubBranchesPageLoader;
  loadCommitDetails: GitHubCommitDetailsLoader;
  loadCommitsPage: GitHubCommitsPageLoader;
} & Omit<BranchControl, "loadBranchesPage" | "loadCommitDetails" | "loadCommitsPage">) {
  const branchPagination = useBranchPagination(repoBundle, loadBranchesPage);

  return (
    <LoadedGitHubRepoDashboard
      key={`${repoBundle.repo.full_name}:${repoBundle.selectedBranch}:${repoBundle.commits[0]?.sha ?? ""}`}
      repoBundle={repoBundle}
      branches={branchPagination.branches}
      totalBranches={branchPagination.totalBranches}
      hasMoreBranches={branchPagination.hasMoreBranches}
      isLoadingMoreBranches={branchPagination.isLoadingMoreBranches}
      onLoadMoreBranches={() => {
        void branchPagination.loadMoreBranches();
      }}
      detailsCacheRef={detailsCacheRef}
      loadCommitDetails={loadCommitDetails}
      loadCommitsPage={loadCommitsPage}
      {...control}
    />
  );
}

function LoadedGitHubRepoDashboard({
  repoBundle,
  branches,
  totalBranches,
  hasMoreBranches,
  isLoadingMoreBranches,
  onLoadMoreBranches,
  detailsCacheRef,
  onBranchChange,
  isLoading,
  loadCommitDetails,
  loadCommitsPage,
}: {
  repoBundle: RepoBundle;
  branches: RepoBundle["branches"];
  totalBranches: number;
  hasMoreBranches: boolean;
  isLoadingMoreBranches: boolean;
  onLoadMoreBranches: () => void;
  detailsCacheRef: RefObject<Map<string, RepoCommitDetails>>;
  loadCommitDetails: GitHubCommitDetailsLoader;
  loadCommitsPage: GitHubCommitsPageLoader;
} & Omit<BranchControl, "loadBranchesPage" | "loadCommitDetails" | "loadCommitsPage">) {
  const { repo, tags, totalTags, fileTree, selectedBranch } = repoBundle;
  const [fileTreeSearch, setFileTreeSearch] = useState("");
  const commitList = useRepoCommitList({
    repoBundle,
    detailsCacheRef,
    loadCommitDetails,
    loadCommitsPage,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <RepositoryTree
        repo={repo}
        branches={branches}
        totalBranches={totalBranches}
        hasMoreBranches={hasMoreBranches}
        isLoadingMoreBranches={isLoadingMoreBranches}
        onLoadMoreBranches={onLoadMoreBranches}
        tags={tags}
        totalTags={totalTags}
        fileTree={fileTree}
        selectedBranch={selectedBranch}
        onBranchChange={onBranchChange}
        isLoading={isLoading}
        fileTreeSearch={fileTreeSearch}
        setFileTreeSearch={setFileTreeSearch}
      />
      <CommitHistory
        commits={commitList.commits}
        totalCommits={commitList.totalCommits}
        expandedCommitSha={commitList.expandedCommitSha}
        setExpandedCommitSha={(sha) => {
          void commitList.toggleCommit(sha);
        }}
        loadingCommitSha={commitList.loadingCommitSha}
        loadingMoreFilesCommitSha={commitList.loadingMoreFilesCommitSha}
        onLoadMoreCommitFiles={(sha) => {
          void commitList.loadMoreCommitFiles(sha);
        }}
        hasMoreCommits={commitList.hasMoreCommits}
        isLoadingMore={commitList.isLoadingMore}
        onLoadMore={() => {
          void commitList.loadMoreCommits();
        }}
        diffMode={commitList.diffMode}
        setDiffMode={commitList.setDiffMode}
      />
    </div>
  );
}
