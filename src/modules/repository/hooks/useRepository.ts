import { isMessageKey, type MessageKey } from "@modules/i18n";
import { useSettings } from "@modules/settings";
import { useState } from "react";

import type { RepoBundle } from "../model/repository";
import { fetchGitHubProjectBundle, type GitHubProjectLoader } from "../services/github";

export function useRepository(
  defaultRepoUrl: string,
  loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle,
) {
  const { githubToken } = useSettings();
  const [repoUrlInput, setRepoUrlInput] = useState(defaultRepoUrl);
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
    hasGithubToken: Boolean(githubToken),
    repoBundle,
    isLoadingRepo,
    repoError,
    handleLoadRepo,
  };
}
