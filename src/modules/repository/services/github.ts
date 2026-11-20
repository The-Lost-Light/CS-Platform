import { isMessageKey } from "@modules/i18n";
import { parseGitHubRepoUrl } from "@shared/githubRepoUrl";
import { isRecord } from "@shared/isRecord";

import type { RepoBundle } from "../model/repository";

export async function fetchGitHubProjectBundle(
  rawUrl: string,
  branch?: string,
): Promise<RepoBundle> {
  const parsed = parseGitHubRepoUrl(rawUrl);
  if (!parsed) throw new Error("github.errors.invalidUrl");
  const params = new URLSearchParams({ repo: parsed.fullKey });
  if (branch !== undefined) params.set("branch", branch);
  const response = await fetch(`/api/github/repository?${params}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (isRecord(body) && typeof body.error === "string" && isMessageKey(body.error))
      throw new Error(body.error);
    throw new Error("workspace.errors.syncFailed");
  }
  return response.json();
}

export type GitHubProjectLoader = typeof fetchGitHubProjectBundle;
