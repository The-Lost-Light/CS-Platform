import { useRef, useState, type RefObject } from "react";

import type { DiffMode } from "../model/diff";
import type { RepoBundle, RepoCommit, RepoCommitDetails } from "../model/repository";
import {
  fetchGitHubBranchesPage,
  fetchGitHubCommitDetails,
  fetchGitHubCommitsPage,
  getCachedCommitDetails,
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

function getCommitCacheKey(repoFullName: string, sha: string): string {
  return `${repoFullName.toLowerCase()}:${sha}`;
}

function mergeCommitDetails(commit: RepoCommit, details?: RepoCommitDetails): RepoCommit {
  if (!details) return commit;
  return {
    ...commit,
    ...(details.stats !== undefined ? { stats: details.stats } : {}),
    ...(details.files !== undefined ? { files: details.files } : {}),
    diffError: details.diffError,
  };
}

export function GitHubRepoDashboard({
  repoBundle,
  loadBranchesPage = fetchGitHubBranchesPage,
  loadCommitDetails = fetchGitHubCommitDetails,
  loadCommitsPage = fetchGitHubCommitsPage,
  ...control
}: { repoBundle: RepoBundle | null } & BranchControl) {
  const detailsCacheRef = useRef(new Map<string, RepoCommitDetails>());
  const [branchPagination, setBranchPagination] = useState<{
    source: RepoBundle["branches"];
    branches: RepoBundle["branches"];
    nextPage: number;
    hasMore: boolean;
  } | null>(null);
  const [loadingBranchesSource, setLoadingBranchesSource] = useState<RepoBundle["branches"] | null>(
    null,
  );
  const branchLoadRequest = useRef(0);

  if (!repoBundle?.repo) return null;

  const activeBranchState =
    branchPagination && branchPagination.source === repoBundle.branches
      ? branchPagination
      : {
          source: repoBundle.branches,
          branches: repoBundle.branches,
          nextPage: 2,
          hasMore: Boolean(repoBundle.hasMoreBranches),
        };
  const resolvedTotalBranches = Math.max(
    repoBundle.totalBranches ?? activeBranchState.branches.length,
    activeBranchState.branches.length,
  );
  const hasMoreBranches =
    activeBranchState.hasMore &&
    (repoBundle.totalBranches === undefined ||
      activeBranchState.branches.length < resolvedTotalBranches);
  const isLoadingMoreBranches = loadingBranchesSource === repoBundle.branches;

  const handleLoadMoreBranches = async () => {
    if (isLoadingMoreBranches || !hasMoreBranches) return;
    const source = repoBundle.branches;
    const targetRepo = repoBundle.repo.full_name;
    const pageToFetch = activeBranchState.nextPage;
    const requestId = ++branchLoadRequest.current;
    setLoadingBranchesSource(source);
    try {
      const pageResult = await loadBranchesPage(targetRepo, pageToFetch);
      if (branchLoadRequest.current !== requestId) return;
      setBranchPagination((prev) => {
        const current =
          prev && prev.source === source
            ? prev
            : {
                source,
                branches: source,
                nextPage: 2,
                hasMore: Boolean(repoBundle.hasMoreBranches),
              };
        const seen = new Set(current.branches.map((b) => b.name));
        const appended = pageResult.branches.filter((b) => !seen.has(b.name));
        const merged = appended.length > 0 ? [...current.branches, ...appended] : current.branches;
        const nextHasMore =
          pageResult.hasMore &&
          pageResult.branches.length > 0 &&
          (repoBundle.totalBranches === undefined || merged.length < repoBundle.totalBranches);
        return {
          source,
          branches: merged,
          nextPage: current.nextPage + 1,
          hasMore: nextHasMore,
        };
      });
    } catch {
      // Keep current branch list and allow retrying when loading more fails.
    } finally {
      if (branchLoadRequest.current === requestId) setLoadingBranchesSource(null);
    }
  };

  return (
    <LoadedGitHubRepoDashboard
      key={`${repoBundle.repo.full_name}:${repoBundle.selectedBranch}:${repoBundle.commits[0]?.sha ?? ""}`}
      repoBundle={repoBundle}
      branches={activeBranchState.branches}
      totalBranches={resolvedTotalBranches}
      hasMoreBranches={hasMoreBranches}
      isLoadingMoreBranches={isLoadingMoreBranches}
      onLoadMoreBranches={() => {
        void handleLoadMoreBranches();
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
  const initialTotal = repoBundle.totalCommits ?? repoBundle.commits.length;

  const [expandedCommitSha, setExpandedCommitSha] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<DiffMode>("unified");
  const [fileTreeSearch, setFileTreeSearch] = useState("");
  const [commits, setCommits] = useState<RepoCommit[]>(() =>
    repoBundle.commits.map((commit) =>
      mergeCommitDetails(commit, getCachedCommitDetails(repo.full_name, commit.sha)),
    ),
  );
  const [nextPage, setNextPage] = useState(2);
  const [reachedEnd, setReachedEnd] = useState(() => repoBundle.commits.length >= initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingCommitShas, setLoadingCommitShas] = useState<Set<string>>(() => new Set());

  const totalCommits = Math.max(repoBundle.totalCommits ?? commits.length, commits.length);
  const hasMoreCommits = !reachedEnd && commits.length < totalCommits;

  const handleToggleCommit = async (nextSha: string | null) => {
    setExpandedCommitSha(nextSha);
    if (!nextSha) return;

    const current = commits.find((c) => c.sha === nextSha);
    if (current && Array.isArray(current.files) && !current.diffError) return;

    const cacheKey = getCommitCacheKey(repo.full_name, nextSha);
    const cached =
      detailsCacheRef.current.get(cacheKey) ?? getCachedCommitDetails(repo.full_name, nextSha);
    if (cached) {
      setCommits((prev) =>
        prev.map((c) => (c.sha === nextSha ? mergeCommitDetails(c, cached) : c)),
      );
      return;
    }

    if (loadingCommitShas.has(nextSha)) return;
    setLoadingCommitShas((prev) => new Set(prev).add(nextSha));
    try {
      const details = await loadCommitDetails(repo.full_name, nextSha);
      if (!details.diffError && Array.isArray(details.files)) {
        detailsCacheRef.current.set(cacheKey, details);
      }
      setCommits((prev) =>
        prev.map((c) => (c.sha === nextSha ? mergeCommitDetails(c, details) : c)),
      );
    } catch {
      setCommits((prev) => prev.map((c) => (c.sha === nextSha ? { ...c, diffError: true } : c)));
    } finally {
      setLoadingCommitShas((prev) => {
        if (!prev.has(nextSha)) return prev;
        const next = new Set(prev);
        next.delete(nextSha);
        return next;
      });
    }
  };

  const handleLoadMoreCommits = async () => {
    if (isLoadingMore || reachedEnd) return;
    setIsLoadingMore(true);
    try {
      const pageResult = await loadCommitsPage(repo.full_name, selectedBranch, nextPage);
      const existingShas = new Set(commits.map((c) => c.sha));
      const freshCommits = pageResult.commits
        .filter((c) => !existingShas.has(c.sha))
        .map((commit) =>
          mergeCommitDetails(
            commit,
            detailsCacheRef.current.get(getCommitCacheKey(repo.full_name, commit.sha)) ??
              getCachedCommitDetails(repo.full_name, commit.sha),
          ),
        );
      const updatedCount = commits.length + freshCommits.length;
      if (freshCommits.length > 0) {
        setCommits((prev) => {
          const seen = new Set(prev.map((c) => c.sha));
          const appended = freshCommits.filter((c) => !seen.has(c.sha));
          return appended.length > 0 ? [...prev, ...appended] : prev;
        });
      }
      setNextPage((prev) => prev + 1);
      if (
        pageResult.commits.length === 0 ||
        !pageResult.hasMore ||
        (repoBundle.totalCommits !== undefined && updatedCount >= repoBundle.totalCommits)
      ) {
        setReachedEnd(true);
      }
    } catch {
      // Keep current page and allow retrying when loading more fails.
    } finally {
      setIsLoadingMore(false);
    }
  };

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
        commits={commits}
        totalCommits={totalCommits}
        expandedCommitSha={expandedCommitSha}
        setExpandedCommitSha={(sha) => {
          void handleToggleCommit(sha);
        }}
        loadingCommitSha={
          expandedCommitSha && loadingCommitShas.has(expandedCommitSha) ? expandedCommitSha : null
        }
        hasMoreCommits={hasMoreCommits}
        isLoadingMore={isLoadingMore}
        onLoadMore={() => {
          void handleLoadMoreCommits();
        }}
        diffMode={diffMode}
        setDiffMode={setDiffMode}
      />
    </div>
  );
}
