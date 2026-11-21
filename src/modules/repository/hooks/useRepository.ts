import { isMessageKey, type MessageKey } from "@modules/i18n";
import { parseGitHubRepoUrl, resolveWorkspaceRepoUrl } from "@shared/githubRepoUrl";
import { useRef, useState } from "react";

import type { RepoBundle } from "../model/repository";
import {
  fetchGitHubBranchSnapshot,
  fetchGitHubProjectBundle,
  type GitHubBranchLoader,
  type GitHubProjectLoader,
} from "../services/github";

function toRepoError(err: unknown): { key: MessageKey } | { message: string } {
  return err instanceof Error
    ? isMessageKey(err.message)
      ? { key: err.message }
      : { message: err.message }
    : { key: "workspace.errors.syncFailed" };
}

export function useRepository(
  defaultRepoUrl: string,
  loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle,
  initialRepoBundle: RepoBundle | null = null,
  loadBranch?: GitHubBranchLoader,
) {
  const [repoUrlInput, setRepoUrlInputState] = useState(defaultRepoUrl);
  const [repoUrl, setRepoUrl] = useState(() => resolveWorkspaceRepoUrl(defaultRepoUrl));
  const setRepoUrlInput = (next: string) => {
    setRepoUrlInputState(next);
    setRepoUrl((current) => resolveWorkspaceRepoUrl(next, current));
  };
  const [repoBundle, setRepoBundle] = useState<RepoBundle | null>(initialRepoBundle);
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState<{ key: MessageKey } | { message: string } | null>(
    null,
  );
  const latestRequest = useRef(0);
  const resolveBranch: GitHubBranchLoader =
    loadBranch ??
    (loadRepository === fetchGitHubProjectBundle
      ? fetchGitHubBranchSnapshot
      : async (targetUrl, branch) => {
          const bundle = await loadRepository(targetUrl, branch);
          return {
            selectedBranch: bundle.selectedBranch,
            commits: bundle.commits,
            totalCommits: bundle.totalCommits ?? bundle.commits.length,
            fileTree: bundle.fileTree,
            rateLimit: bundle.rateLimit,
          };
        });

  const handleLoadRepo = async (targetUrl = repoUrlInput, branch?: string) => {
    const request = ++latestRequest.current;
    const sameRepo =
      repoBundle &&
      parseGitHubRepoUrl(targetUrl)?.fullKey.toLowerCase() ===
        repoBundle.repo.full_name.toLowerCase();
    const targetBranch = branch ?? (sameRepo ? repoBundle.selectedBranch : undefined);
    setIsLoadingRepo(true);
    setRepoError(null);
    try {
      const bundle = await loadRepository(targetUrl, targetBranch);
      if (request === latestRequest.current) {
        setRepoBundle(bundle);
        setIsEditingRepo(false);
      }
    } catch (err) {
      if (request !== latestRequest.current) return;
      setRepoError(toRepoError(err));
    } finally {
      if (request === latestRequest.current) setIsLoadingRepo(false);
    }
  };

  const switchBranch = async (branch: string) => {
    if (!repoBundle) return;
    const targetRepo = repoBundle.repo.full_name;
    const request = ++latestRequest.current;
    setIsLoadingRepo(true);
    setRepoError(null);
    try {
      const snapshot = await resolveBranch(targetRepo, branch);
      if (request === latestRequest.current) {
        setRepoBundle((current) =>
          current && current.repo.full_name.toLowerCase() === targetRepo.toLowerCase()
            ? {
                ...current,
                selectedBranch: snapshot.selectedBranch,
                commits: snapshot.commits,
                totalCommits: snapshot.totalCommits,
                fileTree: snapshot.fileTree,
                ...(snapshot.rateLimit ? { rateLimit: snapshot.rateLimit } : {}),
              }
            : current,
        );
      }
    } catch (err) {
      if (request !== latestRequest.current) return;
      setRepoError(toRepoError(err));
    } finally {
      if (request === latestRequest.current) setIsLoadingRepo(false);
    }
  };

  return {
    repoUrl,
    repoUrlInput,
    setRepoUrlInput,
    repoBundle,
    isEditingRepo,
    startEditingRepo: () => {
      if (!repoUrlInput.trim() && repoBundle?.repo) {
        setRepoUrlInput(repoBundle.repo.html_url || repoBundle.repo.full_name);
      }
      setIsEditingRepo(true);
    },
    isLoadingRepo,
    repoError,
    handleLoadRepo,
    handleBranchChange: (branch: string) => {
      void switchBranch(branch);
    },
  };
}
