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

interface GitHubOptions {
  token: string | undefined;
  fetch?: typeof globalThis.fetch;
}

type GitHubRequest = (url: string) => Promise<Response>;

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

function createGitHubClient(rawUrl: string, { token, fetch = globalThis.fetch }: GitHubOptions) {
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
  options: GitHubOptions,
): Promise<RepoCommitDetails> {
  const trimmedSha = sha.trim();
  if (!trimmedSha) throw new GitHubRequestError(400, "github.errors.invalidUrl");
  const { repoApiUrl, request } = createGitHubClient(rawUrl, options);

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
  options: GitHubOptions & { branch?: string; page: number },
): Promise<RepoCommitsPage> {
  const { branch, page } = options;
  const branchQuery = branch ? `sha=${encodeURIComponent(branch)}&` : "";
  const { items: commits, hasMore } = await fetchListPage<RepoCommit>(
    rawUrl,
    options,
    `commits?${branchQuery}per_page=10&page=${page}`,
  );
  return { commits, hasMore: hasMore || commits.length >= 10 };
}

async function fetchListPage<T>(
  rawUrl: string,
  options: GitHubOptions & { page: number },
  path: string,
) {
  if (!Number.isInteger(options.page) || options.page < 1)
    throw new GitHubRequestError(400, "github.errors.invalidUrl");
  const { repoApiUrl, request } = createGitHubClient(rawUrl, options);
  const response = await request(`${repoApiUrl}/${path}`);
  checkResponse(response);
  const data: unknown = await response.json();
  const items: T[] = Array.isArray(data) ? data : [];
  return { items, hasMore: hasNextPage(response) };
}

async function readPagination(
  response: Response,
  itemCount: number,
  perPage: number,
  fetchCount: () => Promise<Response>,
) {
  if (!hasNextPage(response)) return { total: itemCount, hasMore: false, exact: true };
  try {
    const countResponse = await fetchCount();
    const exactTotal = countResponse.ok ? parseLastPage(countResponse) : null;
    if (exactTotal !== null) return { total: exactTotal, hasMore: true, exact: true };
  } catch {
    // An unavailable count endpoint still leaves a usable first page.
  }
  const lastPage = parseLastPage(response);
  const total = lastPage === null ? itemCount : Math.max(itemCount, (lastPage - 1) * perPage + 1);
  return { total, hasMore: true, exact: false };
}

async function fetchBranchCommits(
  repoApiUrl: string,
  request: GitHubRequest,
  encodedBranch: string,
  { strict }: { strict: boolean },
): Promise<{ commits: RepoCommit[]; totalCommits: number; rateLimit?: string }> {
  try {
    const prefix = `${repoApiUrl}/commits?sha=${encodedBranch}&per_page=`;
    const response = await request(`${prefix}10`);
    checkResponse(response);
    const rateLimit = parseRateLimit(response);
    const list: unknown = await response.json();
    const commits: RepoCommit[] = Array.isArray(list) ? list : [];
    const { total } = await readPagination(response, commits.length, 10, () =>
      request(`${prefix}1`),
    );
    return { commits, totalCommits: total, rateLimit };
  } catch (error) {
    // Initial sync can show partial repository data. A switch must succeed as a unit.
    if (strict) throw error;
    return { commits: [], totalCommits: 0 };
  }
}

async function fetchBranchTree(
  repoApiUrl: string,
  request: GitHubRequest,
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
  request: GitHubRequest,
  { perPage, extraQuery }: { perPage: number; extraQuery?: string },
): Promise<{ items: T[]; total: number; hasMore: boolean; ok: boolean; exact: boolean }> {
  const prefix = `${baseUrl}?${extraQuery ? extraQuery + "&" : ""}per_page=`;
  const empty = { items: [], total: 0, hasMore: false, ok: false, exact: false };
  try {
    const response = await request(`${prefix}${perPage}`);
    if (!response.ok) return empty;
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return empty;
    const items = data as T[];
    const pagination = await readPagination(response, items.length, perPage, () =>
      request(`${prefix}1`),
    );
    return { items, ok: true, ...pagination };
  } catch {
    return empty;
  }
}

export async function fetchGitHubBranchesPage(
  rawUrl: string,
  options: GitHubOptions & { page: number },
): Promise<RepoBranchesPage> {
  const { items: branches, hasMore } = await fetchListPage<RepoBranchItem>(
    rawUrl,
    options,
    `branches?per_page=30&page=${options.page}`,
  );
  return { branches, hasMore };
}

export async function fetchGitHubBranchSnapshot(
  rawUrl: string,
  branch: string,
  options: GitHubOptions,
): Promise<RepoBranchSnapshot> {
  const trimmedBranch = branch.trim();
  if (!trimmedBranch) throw new GitHubRequestError(400, "github.errors.invalidUrl");
  const { repoApiUrl, request } = createGitHubClient(rawUrl, options);
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
  options: GitHubOptions & { branch?: string },
): Promise<RepoBundle> {
  const { branch } = options;
  const { repoApiUrl, request } = createGitHubClient(rawUrl, options);
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
