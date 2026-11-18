import type { RepoBundle } from "@domain/repository";
import { fetchLiveRepoBundle } from "@services/github/client";
import { parseGitHubRepoUrl } from "@services/github/repoUrl";
export { parseGitHubRepoUrl } from "@services/github/repoUrl";

export interface GitHubServiceDependencies {
  fetch?: typeof globalThis.fetch;
}

/** Inject the HTTP transport for GitHub API requests. */
export function createGitHubService(
  dependencies: GitHubServiceDependencies = {},
) {
  return async function fetchGitHubProjectBundle(
    rawUrl: string,
    githubToken = "",
  ): Promise<RepoBundle> {
    const parsed = parseGitHubRepoUrl(rawUrl);
    if (!parsed) {
      throw new Error("github.errors.invalidUrl");
    }
    return fetchLiveRepoBundle(parsed, githubToken, dependencies.fetch);
  };
}

export const fetchGitHubProjectBundle = createGitHubService();
export type GitHubProjectLoader = typeof fetchGitHubProjectBundle;
