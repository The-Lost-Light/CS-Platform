import {
  acquireGitHubUserQuota,
  fetchGitHubBranchesPage,
  fetchGitHubBranchSnapshot,
  fetchGitHubCommitDetails,
  fetchGitHubCommitsPage,
  fetchGitHubRepository,
  GitHubRequestError,
} from "@server/github";
import { parseGitHubRepoUrl } from "@shared/githubRepoUrl";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { env } from "void/env";

function parsePositivePage(raw: string | undefined): number | null {
  if (raw === undefined || !raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "private, no-store");
  const user = requireAuth(c);
  const repo = c.req.query("repo") ?? "";
  const branch = c.req.query("branch");
  const scope = c.req.query("scope");
  const commit = c.req.query("commit");
  const page = c.req.query("page");

  if (!parseGitHubRepoUrl(repo)) {
    return c.json({ error: "github.errors.invalidUrl" }, 400);
  }

  let validatedPage = 1;
  if (commit !== undefined) {
    if (!commit.trim()) return c.json({ error: "github.errors.invalidUrl" }, 400);
    if (page !== undefined) {
      const parsed = parsePositivePage(page);
      if (parsed === null) return c.json({ error: "github.errors.invalidUrl" }, 400);
      validatedPage = parsed;
    }
  } else if (scope !== undefined) {
    if (scope === "branch") {
      if (!branch?.trim()) return c.json({ error: "github.errors.invalidUrl" }, 400);
    } else if (scope === "branches") {
      const parsed = parsePositivePage(page);
      if (parsed === null) return c.json({ error: "github.errors.invalidUrl" }, 400);
      validatedPage = parsed;
    } else {
      return c.json({ error: "github.errors.invalidUrl" }, 400);
    }
  } else if (page !== undefined) {
    const parsed = parsePositivePage(page);
    if (parsed === null) return c.json({ error: "github.errors.invalidUrl" }, 400);
    validatedPage = parsed;
  }

  const quota = acquireGitHubUserQuota(user.id);
  if (!quota.allowed) {
    c.header("Retry-After", String(quota.retryAfterSeconds));
    return c.json({ error: "github.errors.limited" }, 429);
  }

  try {
    if (commit !== undefined) {
      const details = await fetchGitHubCommitDetails(repo, commit, {
        token: env.GITHUB_TOKEN,
        page: validatedPage,
      });
      return c.json(details);
    }
    if (scope === "branch") {
      const snapshot = await fetchGitHubBranchSnapshot(repo, branch ?? "", {
        token: env.GITHUB_TOKEN,
      });
      return c.json(snapshot);
    }
    if (scope === "branches") {
      const branchesPage = await fetchGitHubBranchesPage(repo, {
        token: env.GITHUB_TOKEN,
        page: validatedPage,
      });
      return c.json(branchesPage);
    }
    if (page !== undefined) {
      const commitsPage = await fetchGitHubCommitsPage(repo, {
        token: env.GITHUB_TOKEN,
        branch,
        page: validatedPage,
      });
      return c.json(commitsPage);
    }
    const bundle = await fetchGitHubRepository(repo, {
      token: env.GITHUB_TOKEN,
      branch,
    });
    return c.json(bundle);
  } catch (error) {
    if (error instanceof GitHubRequestError) return c.json({ error: error.key }, error.status);
    return c.json({ error: "workspace.errors.syncFailed" }, 502);
  } finally {
    quota.lease.release();
  }
});
