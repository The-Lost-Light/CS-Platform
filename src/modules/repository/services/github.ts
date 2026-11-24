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

const MAX_COMMIT_CACHE_ENTRIES = 500;
const commitDetailsCache = new Map<string, RepoCommitDetails>();

function setCommitDetailsCache(key: string, details: RepoCommitDetails): void {
  if (commitDetailsCache.has(key)) {
    commitDetailsCache.delete(key);
  }
  while (commitDetailsCache.size >= MAX_COMMIT_CACHE_ENTRIES) {
    const oldestKey = commitDetailsCache.keys().next().value;
    if (oldestKey === undefined) break;
    commitDetailsCache.delete(oldestKey);
  }
  commitDetailsCache.set(key, details);
}

export function getCommitCacheKey(fullKey: string, sha: string): string {
  return `${fullKey.toLowerCase()}:${sha}`;
}

function getCommitPageCacheKey(fullKey: string, sha: string, page: number): string {
  const baseKey = getCommitCacheKey(fullKey, sha);
  return page === 1 ? baseKey : `${baseKey}:page:${page}`;
}

export function getCachedCommitDetails(
  rawUrl: string,
  sha: string,
  page = 1,
): RepoCommitDetails | undefined {
  const repo = parseGitHubRepoUrl(rawUrl);
  if (!repo || !Number.isInteger(page) || page < 1) return undefined;
  const key = getCommitPageCacheKey(repo.fullKey, sha.trim(), page);
  const cached = commitDetailsCache.get(key);
  if (cached) {
    commitDetailsCache.delete(key);
    commitDetailsCache.set(key, cached);
  }
  return cached;
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
  page = 1,
): Promise<RepoCommitDetails> {
  const parsed = parseGitHubRepoUrl(rawUrl);
  const trimmedSha = sha.trim();
  const validatedPage = pageParam(page);
  if (!parsed || !trimmedSha) throw new Error("github.errors.invalidUrl");

  const cacheKey = getCommitPageCacheKey(parsed.fullKey, trimmedSha, page);
  const cached = commitDetailsCache.get(cacheKey);
  if (cached) {
    commitDetailsCache.delete(cacheKey);
    commitDetailsCache.set(cacheKey, cached);
    return cached;
  }

  const params = new URLSearchParams({
    repo: parsed.fullKey,
    commit: trimmedSha,
    ...(page > 1 ? { page: validatedPage } : {}),
  });
  const details = await requestRepositoryJson<RepoCommitDetails>(params);
  if (!details.diffError && Array.isArray(details.files)) {
    setCommitDetailsCache(cacheKey, details);
  }
  return details;
}

export type GitHubProjectLoader = typeof fetchGitHubProjectBundle;
export type GitHubBranchLoader = typeof fetchGitHubBranchSnapshot;
export type GitHubBranchesPageLoader = typeof fetchGitHubBranchesPage;
export type GitHubCommitsPageLoader = typeof fetchGitHubCommitsPage;
export type GitHubCommitDetailsLoader = typeof fetchGitHubCommitDetails;
