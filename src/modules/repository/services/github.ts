import { isMessageKey } from "@modules/i18n";
import { parseGitHubRepoUrl } from "@shared/githubRepoUrl";
import { isRecord } from "@shared/isRecord";

import type {
  RepoBranchesPage,
  RepoBranchSnapshot,
  RepoBundle,
  RepoCommitDetails,
  RepoCommitsPage,
} from "../model/repository";

const commitDetailsCache = new Map<string, RepoCommitDetails>();

export function getCommitCacheKey(fullKey: string, sha: string): string {
  return `${fullKey.toLowerCase()}:${sha}`;
}

export function getCachedCommitDetails(rawUrl: string, sha: string): RepoCommitDetails | undefined {
  const repo = parseGitHubRepoUrl(rawUrl);
  return repo ? commitDetailsCache.get(getCommitCacheKey(repo.fullKey, sha.trim())) : undefined;
}

export function clearCommitDetailsCache(): void {
  commitDetailsCache.clear();
}

function repositoryParams(rawUrl: string, query: Record<string, string> = {}) {
  const parsed = parseGitHubRepoUrl(rawUrl);
  if (!parsed) throw new Error("github.errors.invalidUrl");
  return new URLSearchParams({ repo: parsed.fullKey, ...query });
}

function pageParam(page: number) {
  if (!Number.isInteger(page) || page < 1) throw new Error("github.errors.invalidUrl");
  return String(page);
}

async function requestRepositoryJson<T>(params: URLSearchParams): Promise<T> {
  const response = await fetch(`/api/github/repository?${params}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (isRecord(body) && typeof body.error === "string" && isMessageKey(body.error))
      throw new Error(body.error);
    throw new Error("workspace.errors.syncFailed");
  }
  return response.json();
}

export async function fetchGitHubProjectBundle(
  rawUrl: string,
  branch?: string,
): Promise<RepoBundle> {
  const params = repositoryParams(rawUrl);
  if (branch !== undefined) params.set("branch", branch);
  return requestRepositoryJson<RepoBundle>(params);
}

export async function fetchGitHubBranchSnapshot(
  rawUrl: string,
  branch: string,
): Promise<RepoBranchSnapshot> {
  const trimmedBranch = branch.trim();
  if (!trimmedBranch) throw new Error("github.errors.invalidUrl");
  const params = repositoryParams(rawUrl, { branch: trimmedBranch, scope: "branch" });
  return requestRepositoryJson<RepoBranchSnapshot>(params);
}

export async function fetchGitHubBranchesPage(
  rawUrl: string,
  page: number,
): Promise<RepoBranchesPage> {
  const params = repositoryParams(rawUrl, { scope: "branches", page: pageParam(page) });
  return requestRepositoryJson<RepoBranchesPage>(params);
}

export async function fetchGitHubCommitsPage(
  rawUrl: string,
  branch: string,
  page: number,
): Promise<RepoCommitsPage> {
  const params = repositoryParams(rawUrl, { branch, page: pageParam(page) });
  return requestRepositoryJson<RepoCommitsPage>(params);
}

export async function fetchGitHubCommitDetails(
  rawUrl: string,
  sha: string,
): Promise<RepoCommitDetails> {
  const parsed = parseGitHubRepoUrl(rawUrl);
  const trimmedSha = sha.trim();
  if (!parsed || !trimmedSha) throw new Error("github.errors.invalidUrl");

  const cacheKey = getCommitCacheKey(parsed.fullKey, trimmedSha);
  const cached = commitDetailsCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    repo: parsed.fullKey,
    commit: trimmedSha,
  });
  const details = await requestRepositoryJson<RepoCommitDetails>(params);
  if (!details.diffError && Array.isArray(details.files)) {
    commitDetailsCache.set(cacheKey, details);
  }
  return details;
}

export type GitHubProjectLoader = typeof fetchGitHubProjectBundle;
export type GitHubBranchLoader = typeof fetchGitHubBranchSnapshot;
export type GitHubBranchesPageLoader = typeof fetchGitHubBranchesPage;
export type GitHubCommitsPageLoader = typeof fetchGitHubCommitsPage;
export type GitHubCommitDetailsLoader = typeof fetchGitHubCommitDetails;
