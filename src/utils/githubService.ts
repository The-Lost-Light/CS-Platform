import type { RepoBundle, RepoSnapshot } from '../types';
/**
 * GitHub 專案資料擷取與內建快照服務 (延伸自 Demo 2 GitPulse)
 * 支援：
 * 1. 即時呼叫 GitHub REST API (Metadata, Languages, Branches, Commits, Commit Diffs, Git Recursive File Tree)
 * 2. 內建「學生專題倉庫 (student-team/course-oj-platform)」與「熱門開源倉庫 (facebook/react)」完整快照
 */

// Dynamic import keeps snapshot data out of the initial application bundle.
async function loadBuiltinRepoSnapshot(key: string): Promise<RepoSnapshot> {
  const { default: snapshots } = await import('../data/builtinRepoSnapshots.json');
  const snapshotKey = Object.hasOwn(snapshots, key)
    ? key as keyof typeof snapshots
    : 'student-team/course-oj-platform';
  return snapshots[snapshotKey] as RepoSnapshot;
}

export function parseGitHubRepoUrl(rawInput: string) {
  const cleaned = (rawInput || '').trim();
  if (!cleaned) return null;
  const pathPart = cleaned
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const parts = pathPart.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1], fullKey: `${parts[0]}/${parts[1]}` };
  }
  return null;
}

export async function fetchGitHubProjectBundle(rawUrl: string, githubToken = ''): Promise<RepoBundle> {
  const parsed = parseGitHubRepoUrl(rawUrl);
  if (!parsed) {
    throw new Error('github.errors.invalidUrl');
  }

  const normalizedKey = parsed.fullKey.toLowerCase();

  // 若為內建教學專題範例 `student-team/course-oj-platform`，優先載入完整教學快照
  if (normalizedKey === 'student-team/course-oj-platform') {
    return {
      ...await loadBuiltinRepoSnapshot(normalizedKey),
      sourceType: 'snapshot',
      rateLimit: '內建教學專題倉庫',
    };
  }

  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  try {
    const repoRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
      { headers }
    );

    if (!repoRes.ok) {
      throw new Error(`HTTP ${repoRes.status}`);
    }

    const rateRemaining = repoRes.headers.get('x-ratelimit-remaining');
    const rateLimit = repoRes.headers.get('x-ratelimit-limit');
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const [languages, branches, commitsList, treeData] = await Promise.all([
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`, { headers })
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=30`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=10`,
        { headers }
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
        { headers }
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
      sourceType: 'live-api',
      rateLimit: rateRemaining && rateLimit ? `${rateRemaining}/${rateLimit}` : 'Live API',
    };
  } catch (err) {
    const snap = await loadBuiltinRepoSnapshot(normalizedKey);
    return {
      ...snap,
      sourceType: 'fallback-snapshot',
      apiError: err instanceof Error ? err.message : String(err),
      rateLimit: '內建快照備援',
    };
  }
}
