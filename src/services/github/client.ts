import type { RepoBundle } from "@domain/repository";
import type { parseGitHubRepoUrl } from "@services/github/repoUrl";

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
    fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`,
      { headers },
    )
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
    fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=30`,
      { headers },
    )
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

  return {
    repo: repoData,
    languages: languages || {},
    branches: Array.isArray(branches) ? branches : [],
    commits: Array.isArray(commitsList) ? commitsList : [],
    fileTree: Array.isArray(treeData?.tree) ? treeData.tree.slice(0, 250) : [],
    sourceType: "live-api",
    rateLimit:
      rateRemaining && rateLimit ? `${rateRemaining}/${rateLimit}` : "Live API",
  };
}
