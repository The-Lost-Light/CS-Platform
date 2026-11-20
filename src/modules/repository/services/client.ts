import type { RepoBundle, RepoCommit } from "../model/repository";
import type { parseGitHubRepoUrl } from "./repoUrl";

async function fetchCommitDetails(
  commit: RepoCommit,
  repoApiUrl: string,
  headers: Record<string, string>,
  fetch: typeof globalThis.fetch,
): Promise<RepoCommit> {
  let result = commit;
  try {
    // The list endpoint has no files or stats. Only commit details contain patches.
    for (let page = 1; page <= 30; page++) {
      const response = await fetch(
        `${repoApiUrl}/commits/${encodeURIComponent(commit.sha)}?per_page=100&page=${page}`,
        { headers },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const details: Pick<RepoCommit, "stats" | "files"> = await response.json();
      if (!Array.isArray(details.files)) {
        throw new Error("Invalid commit details");
      }
      result = {
        ...result,
        stats: details.stats ?? result.stats,
        files: [...(page === 1 ? [] : (result.files ?? [])), ...details.files],
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
  } catch (error) {
    // Keep the live history and any fetched pages when one diff cannot load.
    return {
      ...result,
      diffError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fetchLiveRepoBundle(
  parsed: NonNullable<ReturnType<typeof parseGitHubRepoUrl>>,
  githubToken: string,
  fetch: typeof globalThis.fetch = globalThis.fetch,
  branch?: string,
): Promise<RepoBundle> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const repoApiUrl = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const repoRes = await fetch(repoApiUrl, { headers });

  if (!repoRes.ok) {
    throw new Error(`HTTP ${repoRes.status}`);
  }

  const rateRemaining = repoRes.headers.get("x-ratelimit-remaining");
  const rateLimit = repoRes.headers.get("x-ratelimit-limit");
  const repoData: RepoBundle["repo"] = await repoRes.json();
  const selectedBranch = branch ?? (repoData.default_branch || "main");
  const encodedBranch = encodeURIComponent(selectedBranch);

  async function fetchBranchSection(path: string) {
    try {
      const response = await fetch(repoApiUrl + path, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      // Initial sync can show partial repository data. A switch must succeed as a unit.
      if (branch !== undefined) throw error;
      return null;
    }
  }

  const collectionUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  const [languages, branches, commitsList, treeData] = await Promise.all([
    fetch(`${collectionUrl}/languages`, { headers })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
    fetch(`${collectionUrl}/branches?per_page=30`, {
      headers,
    })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    fetchBranchSection(`/commits?sha=${encodedBranch}&per_page=10`),
    fetchBranchSection(`/git/trees/${encodedBranch}?recursive=1`),
  ]);

  const commits = await Promise.all(
    (Array.isArray(commitsList) ? commitsList : []).map((commit: RepoCommit) =>
      fetchCommitDetails(commit, repoApiUrl, headers, fetch),
    ),
  );

  return {
    repo: repoData,
    selectedBranch,
    languages: languages || {},
    branches: Array.isArray(branches) ? branches : [],
    commits,
    fileTree: Array.isArray(treeData?.tree) ? treeData.tree.slice(0, 250) : [],
    sourceType: "live-api",
    rateLimit: rateRemaining && rateLimit ? `${rateRemaining}/${rateLimit}` : "Live API",
  };
}
