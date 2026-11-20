import { fetchGitHubRepository, GitHubRequestError } from "@server/github";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { env } from "void/env";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "private, no-store");
  requireAuth(c);
  try {
    const bundle = await fetchGitHubRepository(c.req.query("repo") ?? "", {
      token: env.GITHUB_TOKEN,
      branch: c.req.query("branch"),
    });
    return c.json(bundle);
  } catch (error) {
    if (error instanceof GitHubRequestError) return c.json({ error: error.key }, error.status);
    return c.json({ error: "workspace.errors.syncFailed" }, 502);
  }
});
