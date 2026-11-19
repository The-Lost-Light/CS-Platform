export type SettingsSection = "language" | "theme" | "palette" | "github";

export const GITHUB_TOKEN_STORAGE_PREFIX = "codepulse.githubToken";

export function githubTokenStorageKey(accountScope?: string | null): string | null {
  if (accountScope === null) return null;
  if (accountScope === undefined) return GITHUB_TOKEN_STORAGE_PREFIX;
  const trimmed = accountScope.trim();
  return trimmed ? `${GITHUB_TOKEN_STORAGE_PREFIX}.${trimmed}` : null;
}

export function normalizeGithubToken(raw: string): string {
  return raw.trim();
}
