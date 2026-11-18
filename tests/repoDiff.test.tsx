import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RepoDiff } from "@pages/project/RepoDiff";
import { splitPatch } from "@domain/diff";
import { I18nProvider } from "@i18n";
import { CommitHistory } from "@pages/project/github/CommitHistory";
import { createRepoFixture } from "./fixtures/repository";
import { createGitHubService } from "@services/github";
import { GitHubRepoDashboard } from "@pages/project/GitHubRepoDashboard";

test("split diff pairs replacements and pads unequal changes within each hunk", () => {
  const rows = splitPatch(
    "@@ -1,3 +1,2 @@\n same\n-old\n-extra\n+new\n@@ -9,0 +9 @@\n+added",
  );
  assert.deepEqual(
    rows.map((row) => [row.left?.text ?? null, row.right?.text ?? null]),
    [
      ["@@ -1,3 +1,2 @@", "@@ -1,3 +1,2 @@"],
      [" same", " same"],
      ["-old", "+new"],
      ["-extra", null],
      ["@@ -9,0 +9 @@", "@@ -9,0 +9 @@"],
      [null, "+added"],
    ],
  );
  assert.deepEqual(splitPatch(""), []);
});

test("real API list summaries are enriched and render code in both history diff modes", async () => {
  const snapshot = createRepoFixture();
  const { files, stats, prInfo, ...summary } = snapshot.commits[0];
  const patch = "@@ -1 +1 @@\n-old real code\n+new real code";
  const service = createGitHubService({
    fetch: async (input) => {
      const url = String(input);
      if (url.includes("/commits?")) return Response.json([summary]);
      if (url.includes("/commits/"))
        return Response.json({
          ...summary,
          stats,
          files: [{ ...files![0], patch }],
        });
      if (url.endsWith("/languages")) return Response.json({});
      if (url.includes("/branches?")) return Response.json([]);
      if (url.includes("/trees/")) return Response.json({ tree: [] });
      return Response.json(snapshot.repo);
    },
  });
  const bundle = await service("facebook/react");
  for (const mode of ["unified", "split"] as const) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <CommitHistory
          commits={bundle.commits}
          expandedCommitSha={summary.sha}
          setExpandedCommitSha={() => {}}
          diffMode={mode}
          setDiffMode={() => {}}
        />
      </I18nProvider>,
    );
    assert.ok(html.includes(`data-diff-mode="${mode}"`));
    assert.ok(html.includes("-old real code"));
    assert.ok(html.includes("+new real code"));
  }
  const dashboard = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <GitHubRepoDashboard repoBundle={bundle} />
    </I18nProvider>,
  );
  assert.ok(dashboard.includes('aria-expanded="false"'));
  assert.ok(!dashboard.includes('aria-expanded="true"'));
  assert.ok(!dashboard.includes("+new real code"));
});

test("expanded commits explain missing patches, empty changes and detail failures", async () => {
  const snapshot = createRepoFixture();
  const commit = snapshot.commits[0];
  const cases = [
    {
      commit: { ...commit, files: [] },
      message: "This commit has no changed files.",
    },
    {
      commit: { ...commit, files: [{ ...commit.files![0], patch: undefined }] },
      message: "No text diff is available",
    },
    {
      commit: { ...commit, files: undefined, diffError: "HTTP 403" },
      message: "Could not load all commit changes",
    },
    {
      commit: { ...commit, files: undefined },
      message: "Could not load all commit changes",
    },
  ];
  for (const entry of cases) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <CommitHistory
          commits={[entry.commit]}
          expandedCommitSha={commit.sha}
          setExpandedCommitSha={() => {}}
          diffMode="unified"
          setDiffMode={() => {}}
        />
      </I18nProvider>,
    );
    assert.ok(html.includes(entry.message));
  }
});

test("missing newline markers stay with their respective sides", () => {
  const rows = splitPatch(
    "-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].left?.text, "-old\n\\ No newline at end of file");
  assert.equal(rows[0].right?.text, "+new\n\\ No newline at end of file");
});

test("diff mode changes rendered layout while preserving and escaping code", () => {
  const patch = "@@ -1 +1 @@\n-<old>\n+<new>";
  const unified = renderToStaticMarkup(
    <RepoDiff patch={patch} mode="unified" />,
  );
  const split = renderToStaticMarkup(<RepoDiff patch={patch} mode="split" />);
  assert.ok(!unified.includes("<table"));
  assert.ok(split.includes("<table"));
  assert.equal((split.match(/<td /g) ?? []).length, 4);
  for (const html of [unified, split]) {
    assert.ok(html.includes("-&lt;old&gt;"));
    assert.ok(html.includes("+&lt;new&gt;"));
  }
});
