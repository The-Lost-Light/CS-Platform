import { isMessageKey } from "@modules/i18n";
import { parseGitHubRepoUrl } from "@shared/githubRepoUrl";
import { isRecord } from "@shared/isRecord";

import type { RepoBundle, RepoCommitDetails, RepoCommitsPage } from "../model/repository";

const commitDetailsCache = new Map<string, RepoCommitDetails>();

function getCommitCacheKey(rawUrl: string, sha: string): string | null {
  const parsed = parseGitHubRepoUrl(rawUrl);
  const trimmedSha = sha.trim();
  if (!parsed || !trimmedSha) return null;
  return `${parsed.fullKey.toLowerCase()}:${trimmedSha}`;
}

export function getCachedCommitDetails(rawUrl: string, sha: string): RepoCommitDetails | undefined {
  const key = getCommitCacheKey(rawUrl, sha);
  return key ? commitDetailsCache.get(key) : undefined;
}

export function clearCommitDetailsCache(): void {
  commitDetailsCache.clear();
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
  const parsed = parseGitHubRepoUrl(rawUrl);
  if (!parsed) throw new Error("github.errors.invalidUrl");
  const params = new URLSearchParams({ repo: parsed.fullKey });
  if (branch !== undefined) params.set("branch", branch);
  return requestRepositoryJson<RepoBundle>(params);
}

export async function fetchGitHubCommitsPage(
  rawUrl: string,
  branch: string,
  page: number,
): Promise<RepoCommitsPage> {
  const parsed = parseGitHubRepoUrl(rawUrl);
  if (!parsed || !Number.isInteger(page) || page < 1) {
    throw new Error("github.errors.invalidUrl");
  }
  const params = new URLSearchParams({
    repo: parsed.fullKey,
    branch,
    page: String(page),
  });
  return requestRepositoryJson<RepoCommitsPage>(params);
}

export async function fetchGitHubCommitDetails(
  rawUrl: string,
  sha: string,
): Promise<RepoCommitDetails> {
  const parsed = parseGitHubRepoUrl(rawUrl);
  const trimmedSha = sha.trim();
  if (!parsed || !trimmedSha) throw new Error("github.errors.invalidUrl");

  const cacheKey = `${parsed.fullKey.toLowerCase()}:${trimmedSha}`;
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
export type GitHubCommitsPageLoader = typeof fetchGitHubCommitsPage;
export type GitHubCommitDetailsLoader = typeof fetchGitHubCommitDetails;
