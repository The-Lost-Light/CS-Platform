import type {
  RepoBranchesPage,
  RepoBranchSnapshot,
  RepoBundle,
  RepoCommit,
  RepoCommitDetails,
  RepoCommitsPage,
} from "@modules/repository";
import { parseGitHubRepoUrl } from "@shared/githubRepoUrl";
import { isRecord } from "@shared/isRecord";

type RepoBranchItem = RepoBundle["branches"][number];
type RepoTagItem = NonNullable<RepoBundle["tags"]>[number];
type RepoPullItem = NonNullable<RepoBundle["pulls"]>[number];

export class GitHubRequestError extends Error {
  constructor(
    readonly status: 400 | 404 | 429 | 502 | 503,
    readonly key:
      | "github.errors.invalidUrl"
      | "github.errors.notConfigured"
      | "github.errors.notFound"
      | "github.errors.limited"
      | "workspace.errors.syncFailed",
  ) {
    super(key);
  }
}

function checkResponse(response: Response) {
  if (response.ok) return;
  if (response.status === 404) throw new GitHubRequestError(404, "github.errors.notFound");
  if (response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0")
    throw new GitHubRequestError(429, "github.errors.limited");
  throw new GitHubRequestError(502, "workspace.errors.syncFailed");
}

function parseRateLimit(response: Response): string | undefined {
  const rateRemaining = response.headers.get("x-ratelimit-remaining");
  const rateLimit = response.headers.get("x-ratelimit-limit");
  return rateRemaining && rateLimit ? `${rateRemaining}/${rateLimit}` : undefined;
}

function hasNextPage(response: Response): boolean {
  return Boolean(
    response.headers
      .get("link")
      ?.split(",")
      .some((link) => /;\s*rel="next"/.test(link)),
  );
}

function parseLastPage(response: Response): number | null {
  const linkHeader = response.headers.get("link");
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    if (!/;\s*rel="last"/.test(part)) continue;
    const match = part.match(/<([^>]+)>/);
    if (!match) continue;
    try {
      const pageParam = new URL(match[1]).searchParams.get("page");
      const parsed = pageParam ? Number(pageParam) : Number.NaN;
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function createGitHubClient(
  rawUrl: string,
  token: string | undefined,
  fetch: typeof globalThis.fetch,
) {
  const parsed = parseGitHubRepoUrl(rawUrl);
  if (!parsed) throw new GitHubRequestError(400, "github.errors.invalidUrl");
  if (!token?.trim()) throw new GitHubRequestError(503, "github.errors.notConfigured");
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token.trim()}`,
    "User-Agent": "CodePulse-Edu",
  };
  async function request(url: string) {
    // Renamed repositories redirect within the GitHub API. Only send the token there.
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await fetch(url, { headers, redirect: "manual" });
      const location = response.headers.get("location");
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) return response;
      const next = new URL(location, url);
      if (next.origin !== "https://api.github.com") break;
      url = next.href;
    }
    throw new GitHubRequestError(502, "workspace.errors.syncFailed");
  }
  const repoApiUrl = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  return { repoApiUrl, request };
}

export async function fetchGitHubCommitDetails(
  rawUrl: string,
  sha: string,
  {
    token,
    fetch = globalThis.fetch,
  }: {
    token: string | undefined;
    fetch?: typeof globalThis.fetch;
  },
): Promise<RepoCommitDetails> {
  const trimmedSha = sha.trim();
  if (!trimmedSha) throw new GitHubRequestError(400, "github.errors.invalidUrl");
  const { repoApiUrl, request } = createGitHubClient(rawUrl, token, fetch);

  let result: RepoCommitDetails = { sha: trimmedSha };
  try {
    // The list endpoint has no files or stats. Only commit details contain patches.
    for (let page = 1; page <= 30; page++) {
      const response = await request(
        `${repoApiUrl}/commits/${encodeURIComponent(trimmedSha)}?per_page=100&page=${page}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const details: Pick<RepoCommit, "stats" | "files"> = await response.json();
      if (!Array.isArray(details.files)) {
        throw new Error("Invalid commit details");
      }
      result = {
        ...result,
        stats: details.stats ?? result.stats,
        files: [
          ...(page === 1 ? [] : (result.files ?? [])),
          ...details.files.map(({ filename, status, additions, deletions, changes, patch }) => ({
            filename,
            status,
            additions,
            deletions,
            changes,
            patch,
          })),
        ],
      };
      if (!hasNextPage(response)) break;
    }
    return result;
  } catch {
    // Keep any fetched pages when a diff cannot load.
    return {
      ...result,
      diffError: true,
    };
  }
}

export async function fetchGitHubCommitsPage(
  rawUrl: string,
  {
    token,
    branch,
    page,
    fetch = globalThis.fetch,
  }: {
    token: string | undefined;
    branch?: string;
    page: number;
    fetch?: typeof globalThis.fetch;
  },
): Promise<RepoCommitsPage> {
  if (!Number.isInteger(page) || page < 1) {
    throw new GitHubRequestError(400, "github.errors.invalidUrl");
  }
  const { repoApiUrl, request } = createGitHubClient(rawUrl, token, fetch);
  const branchQuery = branch ? `sha=${encodeURIComponent(branch)}&` : "";
  const response = await request(`${repoApiUrl}/commits?${branchQuery}per_page=10&page=${page}`);
  checkResponse(response);
  const data: unknown = await response.json();
  const commits: RepoCommit[] = Array.isArray(data) ? data : [];
  return {
    commits,
    hasMore: hasNextPage(response) || commits.length >= 10,
  };
}

async function fetchBranchCommits(
  repoApiUrl: string,
  request: (url: string) => Promise<Response>,
  encodedBranch: string,
  { strict }: { strict: boolean },
): Promise<{ commits: RepoCommit[]; totalCommits: number; rateLimit?: string }> {
  try {
    const response = await request(`${repoApiUrl}/commits?sha=${encodedBranch}&per_page=10`);
    checkResponse(response);
    const rateLimit = parseRateLimit(response);
    const list: unknown = await response.json();
    const commits: RepoCommit[] = Array.isArray(list) ? list : [];
    let totalCommits = commits.length;

    if (hasNextPage(response)) {
      const lastPageFromList = parseLastPage(response);
      try {
        const countResponse = await request(
          `${repoApiUrl}/commits?sha=${encodedBranch}&per_page=1`,
        );
        if (countResponse.ok) {
          const exactTotal = parseLastPage(countResponse);
          if (exactTotal !== null) {
            totalCommits = exactTotal;
          } else if (lastPageFromList !== null) {
            totalCommits = Math.max(commits.length, (lastPageFromList - 1) * 10 + 1);
          }
        } else if (lastPageFromList !== null) {
          totalCommits = Math.max(commits.length, (lastPageFromList - 1) * 10 + 1);
        }
      } catch {
        if (lastPageFromList !== null) {
          totalCommits = Math.max(commits.length, (lastPageFromList - 1) * 10 + 1);
        }
      }
    }

    return { commits, totalCommits, rateLimit };
  } catch (error) {
    // Initial sync can show partial repository data. A switch must succeed as a unit.
    if (strict) throw error;
    return { commits: [], totalCommits: 0 };
  }
}

async function fetchBranchTree(
  repoApiUrl: string,
  request: (url: string) => Promise<Response>,
  encodedBranch: string,
  { strict }: { strict: boolean },
): Promise<{ fileTree: RepoBundle["fileTree"]; rateLimit?: string }> {
  try {
    const response = await request(`${repoApiUrl}/git/trees/${encodedBranch}?recursive=1`);
    checkResponse(response);
    const rateLimit = parseRateLimit(response);
    const treeData: unknown = await response.json();
    return {
      fileTree: isRecord(treeData) && Array.isArray(treeData.tree) ? treeData.tree : [],
      rateLimit,
    };
  } catch (error) {
    // Initial sync can show partial repository data. A switch must succeed as a unit.
    if (strict) throw error;
    return { fileTree: [] };
  }
}

async function fetchPaginatedCollection<T>(
  baseUrl: string,
  request: (url: string) => Promise<Response>,
  { perPage, extraQuery }: { perPage: number; extraQuery?: string },
): Promise<{ items: T[]; total: number; hasMore: boolean; ok: boolean; exact: boolean }> {
  const prefix = extraQuery ? `${baseUrl}?${extraQuery}&` : `${baseUrl}?`;
  try {
    const response = await request(`${prefix}per_page=${perPage}`);
    if (!response.ok) return { items: [], total: 0, hasMore: false, ok: false, exact: false };
    const data: unknown = await response.json();
    if (!Array.isArray(data))
      return { items: [], total: 0, hasMore: false, ok: false, exact: false };
    const items = data as T[];
    if (!hasNextPage(response)) {
      return { items, total: items.length, hasMore: false, ok: true, exact: true };
    }
    const lastPageFromList = parseLastPage(response);
    try {
      const countResponse = await request(`${prefix}per_page=1`);
      if (countResponse.ok) {
        const exactTotal = parseLastPage(countResponse);
        if (exactTotal !== null) {
          return { items, total: exactTotal, hasMore: true, ok: true, exact: true };
        }
      }
    } catch {
      // Fall back to the lower-bound estimate from the list response if count lookup fails.
    }
    const fallbackTotal =
      lastPageFromList !== null
        ? Math.max(items.length, (lastPageFromList - 1) * perPage + 1)
        : items.length;
    return { items, total: fallbackTotal, hasMore: true, ok: true, exact: false };
  } catch {
    return { items: [], total: 0, hasMore: false, ok: false, exact: false };
  }
}

export async function fetchGitHubBranchesPage(
  rawUrl: string,
  {
    token,
    page,
    fetch = globalThis.fetch,
  }: {
    token: string | undefined;
    page: number;
    fetch?: typeof globalThis.fetch;
  },
): Promise<RepoBranchesPage> {
  if (!Number.isInteger(page) || page < 1) {
    throw new GitHubRequestError(400, "github.errors.invalidUrl");
  }
  const { repoApiUrl, request } = createGitHubClient(rawUrl, token, fetch);
  const response = await request(`${repoApiUrl}/branches?per_page=30&page=${page}`);
  checkResponse(response);
  const data: unknown = await response.json();
  const branches: RepoBranchItem[] = Array.isArray(data) ? data : [];
  return {
    branches,
    hasMore: hasNextPage(response),
  };
}

export async function fetchGitHubBranchSnapshot(
  rawUrl: string,
  branch: string,
  {
    token,
    fetch = globalThis.fetch,
  }: {
    token: string | undefined;
    fetch?: typeof globalThis.fetch;
  },
): Promise<RepoBranchSnapshot> {
  const trimmedBranch = branch.trim();
  if (!trimmedBranch) throw new GitHubRequestError(400, "github.errors.invalidUrl");
  const { repoApiUrl, request } = createGitHubClient(rawUrl, token, fetch);
  const encodedBranch = encodeURIComponent(trimmedBranch);

  const [branchCommits, branchTree] = await Promise.all([
    fetchBranchCommits(repoApiUrl, request, encodedBranch, { strict: true }),
    fetchBranchTree(repoApiUrl, request, encodedBranch, { strict: true }),
  ]);
  const rateLimit = branchCommits.rateLimit ?? branchTree.rateLimit;

  return {
    selectedBranch: trimmedBranch,
    commits: branchCommits.commits,
    totalCommits: branchCommits.totalCommits,
    fileTree: branchTree.fileTree,
    ...(rateLimit ? { rateLimit } : {}),
  };
}

export async function fetchGitHubRepository(
  rawUrl: string,
  {
    token,
    branch,
    fetch = globalThis.fetch,
  }: {
    token: string | undefined;
    branch?: string;
    fetch?: typeof globalThis.fetch;
  },
): Promise<RepoBundle> {
  const { repoApiUrl, request } = createGitHubClient(rawUrl, token, fetch);
  const repoRes = await request(repoApiUrl);
  checkResponse(repoRes);

  const rateLimit = parseRateLimit(repoRes);
  const repoData: RepoBundle["repo"] = await repoRes.json();
  const selectedBranch = branch ?? (repoData.default_branch || "main");
  const encodedBranch = encodeURIComponent(selectedBranch);
  const strictBranch = branch !== undefined;

  const [languages, branchesResult, tagsResult, pullsResult, branchCommits, branchTree] =
    await Promise.all([
      request(`${repoApiUrl}/languages`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
      fetchPaginatedCollection<RepoBranchItem>(`${repoApiUrl}/branches`, request, { perPage: 30 }),
      fetchPaginatedCollection<RepoTagItem>(`${repoApiUrl}/tags`, request, { perPage: 30 }),
      fetchPaginatedCollection<RepoPullItem>(`${repoApiUrl}/pulls`, request, {
        perPage: 30,
        extraQuery: "state=open",
      }),
      fetchBranchCommits(repoApiUrl, request, encodedBranch, { strict: strictBranch }),
      fetchBranchTree(repoApiUrl, request, encodedBranch, { strict: strictBranch }),
    ]);

  const openIssuesCount =
    pullsResult.ok && pullsResult.exact
      ? Math.max(0, (repoData.open_issues_count ?? 0) - pullsResult.total)
      : (repoData.open_issues_count ?? 0);

  return {
    // Authenticated metadata may contain a temporary clone token. Return the dashboard contract.
    repo: {
      full_name: repoData.full_name,
      html_url: repoData.html_url,
      description: repoData.description,
      private: repoData.private,
      default_branch: repoData.default_branch,
      stargazers_count: repoData.stargazers_count,
      forks_count: repoData.forks_count,
      open_issues_count: repoData.open_issues_count,
      size: repoData.size,
      language: repoData.language,
      updated_at: repoData.updated_at,
      homepage: repoData.homepage,
      license: repoData.license,
      topics: repoData.topics,
      owner: { login: repoData.owner.login, avatar_url: repoData.owner.avatar_url },
    },
    selectedBranch,
    languages: languages || {},
    branches: branchesResult.items,
    totalBranches: branchesResult.total,
    hasMoreBranches: branchesResult.hasMore,
    tags: tagsResult.items,
    totalTags: tagsResult.total,
    pulls: pullsResult.items,
    ...(pullsResult.ok ? { totalPulls: pullsResult.total } : {}),
    openIssuesCount,
    commits: branchCommits.commits,
    totalCommits: branchCommits.totalCommits,
    fileTree: branchTree.fileTree,
    sourceType: "live-api",
    rateLimit: rateLimit ?? "Live API",
  };
}
