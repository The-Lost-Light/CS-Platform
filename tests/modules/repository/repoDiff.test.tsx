import { I18nProvider } from "@modules/i18n";
import { GitHubRepoDashboard } from "@modules/repository";
import { fetchGitHubCommitDetails, fetchGitHubRepository } from "@server/github";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

import { splitPatch } from "@/modules/repository/model/diff";
import { buildRepoFileTree } from "@/modules/repository/model/fileTree";
import { BranchSelector } from "@/modules/repository/ui/BranchSelector";
import { CommitHistory } from "@/modules/repository/ui/CommitHistory";
import { RepoDiff } from "@/modules/repository/ui/RepoDiff";
import { RepositoryLanguages } from "@/modules/repository/ui/RepositoryLanguages";
import { RepositoryMetrics } from "@/modules/repository/ui/RepositoryMetrics";

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

test("a selected branch supplies the dashboard tree, history and on-demand diff modes", async () => {
  const snapshot = createRepoFixture();
  const { files, stats, prInfo: _prInfo, ...summary } = snapshot.commits[0];
  const patch = "@@ -1 +1 @@\n-old real code\n+new real code";
  const branch = "feature/dashboard";
  const transport: typeof globalThis.fetch = async (input) => {
    const url = new Request(input).url;
    if (url.includes("/commits?")) {
      assert.strictEqual(new URL(url).searchParams.get("sha"), branch);
      return Response.json([summary]);
    }
    if (url.includes("/commits/")) {
      return Response.json({
        ...summary,
        stats,
        files: [{ ...files![0], patch }],
      });
    }
    if (url.endsWith("/languages")) return Response.json({});
    if (url.includes("/branches?")) return Response.json([]);
    if (url.includes("/trees/")) {
      assert.ok(url.endsWith("/trees/feature%2Fdashboard?recursive=1"));
      return Response.json({
        tree: Array.from({ length: 260 }, (_, idx) => ({
          path: idx === 0 ? "feature-only.ts" : `src/file-${idx}.ts`,
          type: "blob",
          size: 1,
        })),
      });
    }
    return Response.json(snapshot.repo);
  };

  const bundle = await fetchGitHubRepository("facebook/react", {
    token: "test-token",
    branch,
    fetch: transport,
  });
  assert.strictEqual(bundle.commits[0].files, undefined);
  assert.strictEqual(bundle.fileTree.length, 260);
  const searchTree = buildRepoFileTree(bundle.fileTree, "file-259.ts");
  assert.ok(searchTree.roots.get("src")?.children.has("file-259.ts"));

  const details = await fetchGitHubCommitDetails("facebook/react", summary.sha, {
    token: "test-token",
    fetch: transport,
  });
  const detailedCommits = [{ ...bundle.commits[0], ...details }];

  for (const mode of ["unified", "split"] as const) {
    const html = renderToStaticMarkup(
      <I18nProvider initialLanguage="en">
        <CommitHistory
          commits={detailedCommits}
          totalCommits={bundle.totalCommits}
          expandedCommitSha={summary.sha}
          setExpandedCommitSha={() => {}}
          diffMode={mode}
          setDiffMode={() => {}}
        />
      </I18nProvider>,
    );
    assert.ok(html.includes(`data-diff-mode="${mode}"`));
    assert.match(html, /<details\b(?![^>]*\bopen\b)[^>]*>[\s\S]*?<summary\b[^>]*>/);
    assert.ok(html.includes(files![0].filename));
    assert.ok(html.includes(`+${files![0].additions}`));
    assert.ok(html.includes(`-${files![0].deletions}`));
    assert.ok(html.includes("-old real code"));
    assert.ok(html.includes("+new real code"));
  }
  const dashboard = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <GitHubRepoDashboard repoBundle={bundle} onBranchChange={() => {}} />
    </I18nProvider>,
  );
  assert.strictEqual((dashboard.match(/\bh-170\b/g) ?? []).length, 2);
  assert.ok(dashboard.includes("feature-only.ts"));
  assert.ok(dashboard.includes('aria-haspopup="menu"'));
  assert.ok(dashboard.includes('aria-expanded="false"'));
  assert.ok(dashboard.includes(`aria-label="Branch: ${branch}"`));
  assert.ok(!dashboard.includes("<select"));
  assert.ok(dashboard.includes(summary.commit.message));
  assert.ok(dashboard.includes("Total files: 260"));
  assert.ok(dashboard.includes("1 Commits"));
  assert.ok(!dashboard.includes("Load more commits"));
  assert.match(dashboard, /role="tooltip"[^>]*>Branches<\/span>/);
  assert.match(dashboard, /role="tooltip"[^>]*>Tags<\/span>/);
  assert.ok(dashboard.includes('aria-expanded="false"'));
  assert.ok(!dashboard.includes('aria-expanded="true"'));
  assert.ok(!dashboard.includes("+new real code"));

  const paginatedHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <CommitHistory
        commits={bundle.commits}
        totalCommits={25}
        expandedCommitSha={null}
        setExpandedCommitSha={() => {}}
        diffMode="unified"
        setDiffMode={() => {}}
      />
    </I18nProvider>,
  );
  assert.ok(paginatedHtml.includes("25 Commits"));
  assert.ok(paginatedHtml.includes("Load more commits"));

  const loadingDetailHtml = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <CommitHistory
        commits={bundle.commits}
        totalCommits={25}
        expandedCommitSha={summary.sha}
        setExpandedCommitSha={() => {}}
        loadingCommitSha={summary.sha}
        diffMode="unified"
        setDiffMode={() => {}}
      />
    </I18nProvider>,
  );
  assert.ok(loadingDetailHtml.includes("Loading…"));
  assert.ok(!loadingDetailHtml.includes("Could not load all commit changes"));
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

test("repository metrics and tree display exact counts without 30+ and M3 branch selector supports loading more", () => {
  const base = createRepoFixture();

  const zeroIssueMetrics = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <RepositoryMetrics
        repo={{ ...base.repo, open_issues_count: 3 }}
        pulls={[
          { number: 1, state: "open" },
          { number: 2, state: "open" },
          { number: 3, state: "open" },
        ]}
        totalPulls={3}
        openIssuesCount={0}
        onEditRepo={() => {}}
      />
    </I18nProvider>,
  );
  assert.ok(zeroIssueMetrics.includes('aria-label="Open issues: 0"'));
  assert.ok(zeroIssueMetrics.includes('aria-label="Pull requests: 3"'));

  const exactMetrics = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <RepositoryMetrics
        repo={{ ...base.repo, open_issues_count: 120 }}
        pulls={Array.from({ length: 30 }, (_, idx) => ({ number: idx + 1, state: "open" }))}
        totalPulls={45}
        openIssuesCount={75}
        onEditRepo={() => {}}
      />
    </I18nProvider>,
  );
  assert.ok(exactMetrics.includes('aria-label="Open issues: 75"'));
  assert.ok(exactMetrics.includes('aria-label="Pull requests: 45"'));
  assert.ok(!exactMetrics.includes("30+"));

  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, idx) => ({
      name: `item-${idx}`,
      protected: false,
      commit: { sha: "a".repeat(40) },
    }));

  const exactDashboard = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <GitHubRepoDashboard
        repoBundle={{
          ...base,
          branches: makeItems(30),
          totalBranches: 100,
          hasMoreBranches: true,
          tags: makeItems(30),
          totalTags: 64,
        }}
        onBranchChange={() => {}}
      />
    </I18nProvider>,
  );
  assert.ok(exactDashboard.includes('aria-label="Branches: 100"'));
  assert.ok(exactDashboard.includes('aria-label="Tags: 64"'));
  assert.ok(!exactDashboard.includes("30+"));

  const branchItems = makeItems(30);
  const openMenuEn = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <BranchSelector
        defaultBranch="main"
        branches={branchItems}
        totalBranches={100}
        selectedBranch="item-0"
        onBranchChange={() => {}}
        hasMoreBranches
        onLoadMoreBranches={() => {}}
        initialOpen
      />
    </I18nProvider>,
  );
  assert.ok(openMenuEn.includes('class="ui-menu '));
  assert.ok(openMenuEn.includes('role="menu"'));
  assert.ok(openMenuEn.includes('role="menuitemradio"'));
  assert.ok(openMenuEn.includes('aria-checked="true"'));
  assert.ok(openMenuEn.includes('aria-checked="false"'));
  assert.ok(openMenuEn.includes("30 / 100"));
  assert.ok(openMenuEn.includes("Show more branches"));

  const openMenuZh = renderToStaticMarkup(
    <I18nProvider initialLanguage="zh-TW">
      <BranchSelector
        defaultBranch="main"
        branches={branchItems}
        totalBranches={100}
        selectedBranch="item-0"
        onBranchChange={() => {}}
        hasMoreBranches
        onLoadMoreBranches={() => {}}
        initialOpen
      />
    </I18nProvider>,
  );
  assert.ok(openMenuZh.includes("顯示更多分支"));

  const completedMenu = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <BranchSelector
        defaultBranch="main"
        branches={branchItems}
        totalBranches={30}
        selectedBranch="item-0"
        onBranchChange={() => {}}
        hasMoreBranches={false}
        onLoadMoreBranches={() => {}}
        initialOpen
      />
    </I18nProvider>,
  );
  assert.ok(!completedMenu.includes("Show more branches"));

  const loadingMenu = renderToStaticMarkup(
    <I18nProvider initialLanguage="en">
      <BranchSelector
        defaultBranch="main"
        branches={branchItems}
        totalBranches={100}
        selectedBranch="item-0"
        onBranchChange={() => {}}
        hasMoreBranches
        isLoadingMoreBranches
        onLoadMoreBranches={() => {}}
        initialOpen
      />
    </I18nProvider>,
  );
  assert.match(loadingMenu, /disabled=""[^>]*>[\s\S]*Loading…/);
});

test("repository languages bar wraps chips inside card bounds and displays exact percentage tooltips", () => {
  const html = renderToStaticMarkup(
    <RepositoryLanguages
      languages={{
        TypeScript: 5000,
        JavaScript: 2000,
        CSS: 1000,
        HTML: 500,
        Shell: 400,
        Python: 350,
        Go: 250,
        Rust: 200,
        Dockerfile: 150,
        Makefile: 100,
        YAML: 50,
      }}
    />,
  );

  assert.match(html, /^<div class="[^"]*\bflex-wrap\b[^"]*\bmin-w-0\b/);
  assert.ok(html.includes("min-w-[min(100%,14rem)]"));
  assert.ok(html.includes('class="flex flex-wrap items-center gap-2 min-w-0 max-w-full"'));
  assert.ok(!html.includes("flex flex-wrap items-center gap-2 shrink-0"));
  assert.ok(html.includes('title="YAML: 0.5%"'));
  assert.ok(!html.includes('title="YAML: 2.0%"'));
});
