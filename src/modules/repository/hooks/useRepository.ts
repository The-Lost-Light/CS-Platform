import type { RepoBundle } from "../model/repository";
import { isMessageKey, type MessageKey } from "@modules/i18n";
import { fetchGitHubProjectBundle, type GitHubProjectLoader } from "../services/github";
import { useState } from "react";

export function useRepository(
  defaultRepoUrl: string,
  loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle,
) {
  const [repoUrlInput, setRepoUrlInput] = useState(defaultRepoUrl);
  const [githubToken, setGithubToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [repoBundle, setRepoBundle] = useState<RepoBundle | null>(null);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState<{ key: MessageKey } | { message: string } | null>(
    null,
  );
  const handleLoadRepo = async (targetUrl = repoUrlInput) => {
    setIsLoadingRepo(true);
    setRepoError(null);
    try {
      const bundle = await loadRepository(targetUrl, githubToken);
      setRepoBundle(bundle);
    } catch (err) {
      setRepoError(
        err instanceof Error
          ? isMessageKey(err.message)
            ? { key: err.message }
            : { message: err.message }
          : { key: "workspace.errors.syncFailed" },
      );
    } finally {
      setIsLoadingRepo(false);
    }
  };

  return {
    repoUrlInput,
    setRepoUrlInput,
    githubToken,
    setGithubToken,
    showTokenInput,
    setShowTokenInput,
    repoBundle,
    isLoadingRepo,
    repoError,
    handleLoadRepo,
  };
}
