import type { RepoBundle, RepoSnapshot } from "@domain/repository";
import { fetchLiveRepoBundle } from "@services/github/client";
import { parseGitHubRepoUrl } from "@services/github/repoUrl";
import { loadBuiltinRepoSnapshot } from "@services/github/snapshots";
export { parseGitHubRepoUrl } from "@services/github/repoUrl";

export interface GitHubServiceDependencies {
  fetch?: typeof globalThis.fetch;
  loadSnapshot?: (key: string) => Promise<RepoSnapshot>;
}

/** Inject transport and snapshot storage without changing fallback policy. */
export function createGitHubService(
  dependencies: GitHubServiceDependencies = {},
) {
  return async function fetchGitHubProjectBundle(
    rawUrl: string,
    githubToken = "",
  ): Promise<RepoBundle> {
    const parsed = parseGitHubRepoUrl(rawUrl);
    if (!parsed) {
      throw new Error("github.errors.invalidUrl");
    }

    const normalizedKey = parsed.fullKey.toLowerCase();

    // 若為內建教學專題範例 `student-team/course-oj-platform`，優先載入完整教學快照
    if (normalizedKey === "student-team/course-oj-platform") {
      return {
        ...(await (dependencies.loadSnapshot ?? loadBuiltinRepoSnapshot)(
          normalizedKey,
        )),
        sourceType: "snapshot",
        rateLimit: "內建教學專題倉庫",
      };
    }

    try {
      return await fetchLiveRepoBundle(parsed, githubToken, dependencies.fetch);
    } catch (err) {
      const snap = await (dependencies.loadSnapshot ?? loadBuiltinRepoSnapshot)(
        normalizedKey,
      );
      return {
        ...snap,
        sourceType: "fallback-snapshot",
        apiError: err instanceof Error ? err.message : String(err),
        rateLimit: "內建快照備援",
      };
    }
  };
}

export const fetchGitHubProjectBundle = createGitHubService();
export type GitHubProjectLoader = typeof fetchGitHubProjectBundle;
