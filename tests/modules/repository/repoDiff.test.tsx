import { I18nProvider } from "@modules/i18n";
import { GitHubRepoDashboard } from "@modules/repository";
import { fetchGitHubRepository } from "@server/github";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

import { splitPatch } from "@/modules/repository/model/diff";
import { CommitHistory } from "@/modules/repository/ui/CommitHistory";
import { RepoDiff } from "@/modules/repository/ui/RepoDiff";

import { createRepoFixture } from "../../fixtures/repository";

test("split diff pairs replacements and pads unequal changes within each hunk", () => {
  const rows = splitPatch("@@ -1,3 +1,2 @@\n same\n-old\n-extra\n+new\n@@ -9,0 +9 @@\n+added");
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

test("a selected branch supplies the dashboard tree, history and both diff modes", async () => {
  const snapshot = createRepoFixture();
  const { files, stats, prInfo: _prInfo, ...summary } = snapshot.commits[0];
  const patch = "@@ -1 +1 @@\n-old real code\n+new real code";
  const branch = "feature/dashboard";
  const bundle = await fetchGitHubRepository("facebook/react", {
    token: "test-token",
    branch,
    fetch: async (input) => {
      const url = new Request(input).url;
      if (url.includes("/commits?")) {
        assert.strictEqual(new URL(url).searchParams.get("sha"), branch);
        return Response.json([summary]);
      }
      if (url.includes("/commits/"))
        return Response.json({
          ...summary,
          stats,
          files: [{ ...files![0], patch }],
        });
      if (url.endsWith("/languages")) return Response.json({});
      if (url.includes("/branches?")) return Response.json([]);
      if (url.includes("/trees/")) {
        assert.ok(url.endsWith("/trees/feature%2Fdashboard?recursive=1"));
        return Response.json({ tree: [{ path: "feature-only.ts", type: "blob", size: 1 }] });
      }
      return Response.json(snapshot.repo);
    },
  });
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
      <GitHubRepoDashboard repoBundle={bundle} onBranchChange={() => {}} />
    </I18nProvider>,
  );
  assert.ok(dashboard.includes("feature-only.ts"));
  assert.ok(dashboard.includes(`value="${branch}" selected=""`));
  assert.ok(dashboard.includes(summary.commit.message));
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
      commit: { ...commit, files: undefined, diffError: true },
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
  const rows = splitPatch("-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file");
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].left?.text, "-old\n\\ No newline at end of file");
  assert.strictEqual(rows[0].right?.text, "+new\n\\ No newline at end of file");
});

test("diff mode changes rendered layout while preserving and escaping code", () => {
  const patch = "@@ -1 +1 @@\n-<old>\n+<new>";
  const unified = renderToStaticMarkup(<RepoDiff patch={patch} mode="unified" />);
  const split = renderToStaticMarkup(<RepoDiff patch={patch} mode="split" />);
  assert.ok(!unified.includes("<table"));
  assert.ok(split.includes("<table"));
  assert.strictEqual((split.match(/<td /g) ?? []).length, 4);
  for (const html of [unified, split]) {
    assert.ok(html.includes("-&lt;old&gt;"));
    assert.ok(html.includes("+&lt;new&gt;"));
  }
});
