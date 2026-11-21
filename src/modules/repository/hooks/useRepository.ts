import { isMessageKey, type MessageKey } from "@modules/i18n";
import { parseGitHubRepoUrl } from "@shared/githubRepoUrl";
import { useRef, useState } from "react";

import type { RepoBundle } from "../model/repository";
import { fetchGitHubProjectBundle, type GitHubProjectLoader } from "../services/github";

export function useRepository(
  defaultRepoUrl: string,
  loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle,
  initialRepoBundle: RepoBundle | null = null,
) {
  const [repoUrlInput, setRepoUrlInput] = useState(defaultRepoUrl);
  const [repoBundle, setRepoBundle] = useState<RepoBundle | null>(initialRepoBundle);
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState<{ key: MessageKey } | { message: string } | null>(
    null,
  );
  const latestRequest = useRef(0);
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
      setRepoError(
        err instanceof Error
          ? isMessageKey(err.message)
            ? { key: err.message }
            : { message: err.message }
          : { key: "workspace.errors.syncFailed" },
      );
    } finally {
      if (request === latestRequest.current) setIsLoadingRepo(false);
    }
  };

  return {
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
      if (repoBundle) void handleLoadRepo(repoBundle.repo.full_name, branch);
    },
  };
}
