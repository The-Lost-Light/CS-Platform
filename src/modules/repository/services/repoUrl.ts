export function parseGitHubRepoUrl(rawInput: string) {
  const cleaned = (rawInput || "").trim();
  if (!cleaned) return null;
  const pathPart = cleaned
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");

  const parts = pathPart.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return {
      owner: parts[0],
      repo: parts[1],
      fullKey: `${parts[0]}/${parts[1]}`,
    };
  }
  return null;
}
