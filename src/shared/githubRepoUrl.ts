export function parseGitHubRepoUrl(rawInput: string) {
  const path = rawInput.trim().replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "");
  const [owner, name] = path.split("/");
  const repo = name?.replace(/\.git$/i, "");
  if (!/^[\w-]+$/.test(owner) || !repo || !/^[\w.-]+$/.test(repo) || /^\.{1,2}$/.test(repo))
    return null;
  return { owner, repo, fullKey: `${owner}/${repo}` };
}
