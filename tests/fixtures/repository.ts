import type { RepoBundle, RepoCommit } from "@domain/repository";

/** Small, isolated API-shaped data for service and rendering tests. */
export function createRepoFixture(): RepoBundle {
  const identity = { login: "tester", avatar_url: "" };
  const author = {
    name: "Test Author",
    email: "test@example.com",
    date: "2026-01-01T00:00:00Z",
  };
  const commits: RepoCommit[] = ["a", "b"].map((sha) => ({
    sha: sha.repeat(40),
    commit: { message: "Update test files", author, committer: author },
    author: identity,
    committer: identity,
    parents: [],
    stats: { total: 4, additions: 2, deletions: 2 },
    files: ["index.ts", "utils.ts"].map((filename) => ({
      filename,
      status: "modified",
      additions: 1,
      deletions: 1,
      changes: 2,
      patch: "@@ -1 +1 @@\n-old\n+new",
    })),
  }));
  return {
    repo: {
      full_name: "owner/repo",
      html_url: "https://github.com/owner/repo",
      description: "Repository fixture",
      private: false,
      default_branch: "main",
      stargazers_count: 1,
      forks_count: 0,
      open_issues_count: 0,
      size: 1,
      language: "TypeScript",
      updated_at: author.date,
      homepage: "",
      license: { spdx_id: "MIT", name: "MIT License" },
      topics: [],
      owner: identity,
    },
    languages: { TypeScript: 100 },
    branches: [
      { name: "main", protected: false, commit: { sha: commits[0].sha } },
    ],
    commits,
    fileTree: [{ path: "index.ts", type: "blob", size: 1 }],
    sourceType: "live-api",
    rateLimit: "42/60",
  };
}
