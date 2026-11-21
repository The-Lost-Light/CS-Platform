import type { RepoBundle, RepoCommit } from "@modules/repository";
import { parseGitHubRepoUrl } from "@shared/githubRepoUrl";
import { isRecord } from "@shared/isRecord";

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

async function fetchCommitDetails(
  commit: RepoCommit,
  repoApiUrl: string,
  request: (url: string) => Promise<Response>,
): Promise<RepoCommit> {
  let result = commit;
  try {
    // The list endpoint has no files or stats. Only commit details contain patches.
    for (let page = 1; page <= 30; page++) {
      const response = await request(
        `${repoApiUrl}/commits/${encodeURIComponent(commit.sha)}?per_page=100&page=${page}`,
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
      if (
        !response.headers
          .get("link")
          ?.split(",")
          .some((link) => /;\s*rel="next"/.test(link))
      )
        break;
    }
    return result;
  } catch {
    // Keep the live history and any fetched pages when one diff cannot load.
    return {
      ...result,
      diffError: true,
    };
  }
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
  const repoRes = await request(repoApiUrl);
  checkResponse(repoRes);

  const rateRemaining = repoRes.headers.get("x-ratelimit-remaining");
  const rateLimit = repoRes.headers.get("x-ratelimit-limit");
  const repoData: RepoBundle["repo"] = await repoRes.json();
  const selectedBranch = branch ?? (repoData.default_branch || "main");
  const encodedBranch = encodeURIComponent(selectedBranch);

  async function fetchBranchSection(path: string) {
    try {
      const response = await request(repoApiUrl + path);
      checkResponse(response);
      return await response.json();
    } catch (error) {
      // Initial sync can show partial repository data. A switch must succeed as a unit.
      if (branch !== undefined) throw error;
      return null;
    }
  }

  const [languages, branches, tags, pulls, commitsList, treeData] = await Promise.all([
    request(`${repoApiUrl}/languages`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
    request(`${repoApiUrl}/branches?per_page=30`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    request(`${repoApiUrl}/tags?per_page=30`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    request(`${repoApiUrl}/pulls?state=open&per_page=30`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    fetchBranchSection(`/commits?sha=${encodedBranch}&per_page=10`),
    fetchBranchSection(`/git/trees/${encodedBranch}?recursive=1`),
  ]);

  const commits = await Promise.all(
    (Array.isArray(commitsList) ? commitsList : []).map((commit: RepoCommit) =>
      fetchCommitDetails(commit, repoApiUrl, request),
    ),
  );

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
    branches: Array.isArray(branches) ? branches : [],
    tags: Array.isArray(tags) ? tags : [],
    pulls: Array.isArray(pulls) ? pulls : [],
    commits,
    fileTree: isRecord(treeData) && Array.isArray(treeData.tree) ? treeData.tree.slice(0, 250) : [],
    sourceType: "live-api",
    rateLimit: rateRemaining && rateLimit ? `${rateRemaining}/${rateLimit}` : "Live API",
  };
}
