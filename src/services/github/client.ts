import type { RepoBundle, RepoCommit } from "@domain/repository";
import type { parseGitHubRepoUrl } from "@services/github/repoUrl";

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
      const details = await response.json();
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
): Promise<RepoBundle> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const repoRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
    { headers },
  );

  if (!repoRes.ok) {
    throw new Error(`HTTP ${repoRes.status}`);
  }

  const rateRemaining = repoRes.headers.get("x-ratelimit-remaining");
  const rateLimit = repoRes.headers.get("x-ratelimit-limit");
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || "main";

  const [languages, branches, commitsList, treeData] = await Promise.all([
    fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`, { headers })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
    fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=30`, {
      headers,
    })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=10`,
      { headers },
    )
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
      { headers },
    )
      .then((r) => (r.ok ? r.json() : { tree: [] }))
      .catch(() => ({ tree: [] })),
  ]);

  const commits = await Promise.all(
    (Array.isArray(commitsList) ? commitsList : []).map((commit: RepoCommit) =>
      fetchCommitDetails(
        commit,
        `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
        headers,
        fetch,
      ),
    ),
  );

  return {
    repo: repoData,
    languages: languages || {},
    branches: Array.isArray(branches) ? branches : [],
    commits,
    fileTree: Array.isArray(treeData?.tree) ? treeData.tree.slice(0, 250) : [],
    sourceType: "live-api",
    rateLimit: rateRemaining && rateLimit ? `${rateRemaining}/${rateLimit}` : "Live API",
  };
}
