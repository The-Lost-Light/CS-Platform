export const REPO_URL_MAX_LENGTH = 300;

export function parseGitHubRepoUrl(rawInput: string) {
  const trimmed = rawInput.trim();
  if (!trimmed || trimmed.length > REPO_URL_MAX_LENGTH || /[\s?#]/.test(trimmed)) return null;
  const path = trimmed.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "");
  const [owner, name] = path.split("/");
  const repo = name?.replace(/\.git$/i, "");
  if (!/^[\w-]+$/.test(owner) || !repo || !/^[\w.-]+$/.test(repo) || /^\.{1,2}$/.test(repo))
    return null;
  return { owner, repo, fullKey: `${owner}/${repo}` };
}

export function isValidWorkspaceRepoUrl(rawInput: string): boolean {
  if (rawInput.length > REPO_URL_MAX_LENGTH) return false;
  const trimmed = rawInput.trim();
  return !trimmed || parseGitHubRepoUrl(trimmed) !== null;
}

export function resolveWorkspaceRepoUrl(rawInput: string, fallback = ""): string {
  return isValidWorkspaceRepoUrl(rawInput) ? rawInput.trim() : fallback;
}
