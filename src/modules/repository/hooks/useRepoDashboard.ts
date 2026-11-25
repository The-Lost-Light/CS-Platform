import { useRef, useState, type RefObject } from "react";

import type { DiffMode } from "../model/diff";
import {
  appendUniqueBy,
  type RepoBundle,
  type RepoCommit,
  type RepoCommitDetails,
} from "../model/repository";
import {
  getCachedCommitDetails,
  getCommitCacheKey,
  type GitHubBranchesPageLoader,
  type GitHubCommitDetailsLoader,
  type GitHubCommitsPageLoader,
} from "../services/github";

function mergeCommitDetails(commit: RepoCommit, details?: RepoCommitDetails): RepoCommit {
  if (!details) return commit;
  return {
    ...commit,
    ...(details.stats !== undefined ? { stats: details.stats } : {}),
    ...(details.files !== undefined ? { files: details.files } : {}),
    diffError: details.diffError,
    hasMoreFiles: details.hasMoreFiles,
  };
}

function usePendingSet() {
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const add = (key: string) => setPending((prev) => new Set(prev).add(key));
  const remove = (key: string) =>
    setPending((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  return { pending, add, remove };
}

export function useBranchPagination(
  repoBundle: RepoBundle,
  loadBranchesPage: GitHubBranchesPageLoader,
) {
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

  const initialBranchState = {
    source: repoBundle.branches,
    branches: repoBundle.branches,
    nextPage: 2,
    hasMore: Boolean(repoBundle.hasMoreBranches),
  };
  const activeBranchState =
    branchPagination?.source === repoBundle.branches ? branchPagination : initialBranchState;
  const totalBranches = Math.max(
    repoBundle.totalBranches ?? activeBranchState.branches.length,
    activeBranchState.branches.length,
  );
  const hasMoreBranches =
    activeBranchState.hasMore &&
    (repoBundle.totalBranches === undefined || activeBranchState.branches.length < totalBranches);
  const isLoadingMoreBranches = loadingBranchesSource === repoBundle.branches;

  const loadMoreBranches = async () => {
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
        const current = prev?.source === source ? prev : initialBranchState;
        const merged = appendUniqueBy(current.branches, pageResult.branches, (b) => b.name);
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

  return {
    branches: activeBranchState.branches,
    totalBranches,
    hasMoreBranches,
    isLoadingMoreBranches,
    loadMoreBranches,
  };
}

export function useRepoCommitList({
  repoBundle,
  detailsCacheRef,
  loadCommitDetails,
  loadCommitsPage,
}: {
  repoBundle: RepoBundle;
  detailsCacheRef: RefObject<Map<string, RepoCommitDetails>>;
  loadCommitDetails: GitHubCommitDetailsLoader;
  loadCommitsPage: GitHubCommitsPageLoader;
}) {
  const { repo, selectedBranch } = repoBundle;
  const initialTotal = repoBundle.totalCommits ?? repoBundle.commits.length;

  const [expandedCommitSha, setExpandedCommitSha] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<DiffMode>("unified");
  const [commits, setCommits] = useState<RepoCommit[]>(() =>
    repoBundle.commits.map((commit) =>
      mergeCommitDetails(commit, getCachedCommitDetails(repo.full_name, commit.sha)),
    ),
  );
  const [nextPage, setNextPage] = useState(2);
  const [reachedEnd, setReachedEnd] = useState(() => repoBundle.commits.length >= initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const commitLoading = usePendingSet();
  const [commitFilePages, setCommitFilePages] = useState<Record<string, number>>({});
  const moreFilesLoading = usePendingSet();

  const totalCommits = Math.max(repoBundle.totalCommits ?? commits.length, commits.length);
  const hasMoreCommits = !reachedEnd && commits.length < totalCommits;

  const toggleCommit = async (nextSha: string | null) => {
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

    if (commitLoading.pending.has(nextSha)) return;
    commitLoading.add(nextSha);
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
      commitLoading.remove(nextSha);
    }
  };

  const loadMoreCommitFiles = async (sha: string) => {
    const current = commits.find((c) => c.sha === sha);
    if (!current?.hasMoreFiles || moreFilesLoading.pending.has(sha)) return;

    const pageToFetch =
      commitFilePages[sha] ?? Math.max(2, Math.floor((current.files?.length ?? 0) / 100) + 1);
    moreFilesLoading.add(sha);
    try {
      const details = await loadCommitDetails(repo.full_name, sha, pageToFetch);
      if (details.diffError || !Array.isArray(details.files)) {
        setCommits((prev) =>
          prev.map((c) => (c.sha === sha ? { ...c, diffError: true, hasMoreFiles: true } : c)),
        );
        return;
      }

      const incomingFiles = details.files;
      const hasMoreFiles = Boolean(details.hasMoreFiles);
      const cacheKey = getCommitCacheKey(repo.full_name, sha);
      const existingCached = detailsCacheRef.current.get(cacheKey);
      const mergedFiles = appendUniqueBy(
        existingCached?.files ?? current.files ?? [],
        incomingFiles,
        (file) => file.filename,
      );
      detailsCacheRef.current.set(cacheKey, {
        sha,
        stats: details.stats ?? existingCached?.stats ?? current.stats,
        files: mergedFiles,
        hasMoreFiles,
      });

      setCommits((prev) =>
        prev.map((c) =>
          c.sha === sha
            ? {
                ...c,
                ...(details.stats !== undefined ? { stats: details.stats } : {}),
                files: appendUniqueBy(c.files ?? [], incomingFiles, (file) => file.filename),
                diffError: undefined,
                hasMoreFiles,
              }
            : c,
        ),
      );
      setCommitFilePages((prev) => ({ ...prev, [sha]: pageToFetch + 1 }));
    } catch {
      setCommits((prev) =>
        prev.map((c) => (c.sha === sha ? { ...c, diffError: true, hasMoreFiles: true } : c)),
      );
    } finally {
      moreFilesLoading.remove(sha);
    }
  };

  const loadMoreCommits = async () => {
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
        setCommits((prev) => appendUniqueBy(prev, freshCommits, (c) => c.sha));
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

  return {
    commits,
    totalCommits,
    expandedCommitSha,
    diffMode,
    setDiffMode,
    hasMoreCommits,
    isLoadingMore,
    loadingCommitSha:
      expandedCommitSha && commitLoading.pending.has(expandedCommitSha) ? expandedCommitSha : null,
    loadingMoreFilesCommitSha:
      expandedCommitSha && moreFilesLoading.pending.has(expandedCommitSha)
        ? expandedCommitSha
        : null,
    toggleCommit,
    loadMoreCommitFiles,
    loadMoreCommits,
  };
}
