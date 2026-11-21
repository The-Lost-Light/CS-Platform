import {
  fetchGitHubCommitDetails,
  fetchGitHubCommitsPage,
  fetchGitHubRepository,
  GitHubRequestError,
} from "@server/github";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { env } from "void/env";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "private, no-store");
  requireAuth(c);
  const repo = c.req.query("repo") ?? "";
  const branch = c.req.query("branch");
  const commit = c.req.query("commit");
  const page = c.req.query("page");
  try {
    if (commit !== undefined) {
      const details = await fetchGitHubCommitDetails(repo, commit, { token: env.GITHUB_TOKEN });
      return c.json(details);
    }
    if (page !== undefined) {
      const commitsPage = await fetchGitHubCommitsPage(repo, {
        token: env.GITHUB_TOKEN,
        branch,
        page: Number(page),
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
  }
});
