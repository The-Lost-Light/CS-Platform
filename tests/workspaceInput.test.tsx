import { readWorkspaceInput } from "@server/workspaces";
import { isValidWorkspaceRepoUrl, resolveWorkspaceRepoUrl } from "@shared/githubRepoUrl";
import { assert, test } from "vite-plus/test";

function makeWorkspaceRequest(repoUrl: string) {
  return new Request("https://course.example/api/projects/demo/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      revision: null,
      draft: {
        designDoc: "# doc",
        repoUrl,
        model: { format: "codepulse-c4", version: 1, nodes: [], relationships: [] },
      },
    }),
  });
}

test("readWorkspaceInput accepts empty and parseGitHubRepoUrl-compatible repository URLs", async () => {
  for (const [input, expected] of [
    ["", ""],
    ["   ", ""],
    ["https://github.com/owner/repo", "https://github.com/owner/repo"],
    ["https://github.com/owner/repo/tree/main", "https://github.com/owner/repo/tree/main"],
    ["owner/repo/tree/main", "owner/repo/tree/main"],
    [" https://www.github.com/owner/repo.git ", "https://www.github.com/owner/repo.git"],
  ] as const) {
    const result = await readWorkspaceInput(makeWorkspaceRequest(input));
    assert.strictEqual(result.ok, true, `expected ${JSON.stringify(input)} to be accepted`);
    if (result.ok) {
      assert.strictEqual(result.draft.repoUrl, expected);
    }
  }
});

test("readWorkspaceInput rejects repository URLs not accepted by parseGitHubRepoUrl", async () => {
  for (const input of [
    "owner/..",
    "owner/.",
    "owner/.git",
    "https://github.com/owner",
    "owner/repo?q=x",
    "owner/repo/tree/main?q=x",
    "owner/repo/tree/main#readme",
    "https://example.com/owner/repo",
    "owner/repo/foo bar",
    " ".repeat(301),
    `https://github.com/owner/${"a".repeat(300)}`,
  ]) {
    const result = await readWorkspaceInput(makeWorkspaceRequest(input));
    assert.deepEqual(
      result,
      { ok: false, error: "repo" },
      `expected ${JSON.stringify(input)} to fail with repo error`,
    );
  }
});

test("workspace repository URL helpers ignore incomplete edits and invalid legacy defaults", () => {
  assert.strictEqual(isValidWorkspaceRepoUrl(""), true);
  assert.strictEqual(isValidWorkspaceRepoUrl("   "), true);
  assert.strictEqual(isValidWorkspaceRepoUrl("https://github.com/owner/repo/tree/main"), true);
  assert.strictEqual(isValidWorkspaceRepoUrl("owner/.."), false);
  assert.strictEqual(isValidWorkspaceRepoUrl("owner/repo/tree/main?q=x"), false);

  assert.strictEqual(resolveWorkspaceRepoUrl("owner/.."), "");
  assert.strictEqual(resolveWorkspaceRepoUrl("https://github.com/owner", ""), "");
  assert.strictEqual(
    resolveWorkspaceRepoUrl("https://github.com/owner", "https://github.com/owner/repo"),
    "https://github.com/owner/repo",
  );
  assert.strictEqual(
    resolveWorkspaceRepoUrl("owner/repo/tree/main?q=x", "https://github.com/owner/repo"),
    "https://github.com/owner/repo",
  );
  assert.strictEqual(
    resolveWorkspaceRepoUrl("a".repeat(301), "https://github.com/owner/repo"),
    "https://github.com/owner/repo",
  );
  assert.strictEqual(
    resolveWorkspaceRepoUrl(" https://github.com/owner/repo/tree/main ", ""),
    "https://github.com/owner/repo/tree/main",
  );
  assert.strictEqual(resolveWorkspaceRepoUrl("", "https://github.com/owner/repo"), "");
  assert.strictEqual(resolveWorkspaceRepoUrl("   ", "https://github.com/owner/repo"), "");
});
