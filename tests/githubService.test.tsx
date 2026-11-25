import {
  clearCommitDetailsCache,
  fetchGitHubBranchesPage,
  fetchGitHubBranchSnapshot,
  fetchGitHubCommitDetails,
  fetchGitHubCommitsPage,
  fetchGitHubProjectBundle,
  getCachedCommitDetails,
  parseGitHubRepoUrl,
} from "@modules/repository";
import {
  clearServerGitHubCache,
  createGitHubUserRateLimiter,
  fetchGitHubBranchesPage as fetchServerBranchesPage,
  fetchGitHubBranchSnapshot as fetchServerBranchSnapshot,
  fetchGitHubCommitDetails as fetchServerCommitDetails,
  fetchGitHubCommitsPage as fetchServerCommitsPage,
  fetchGitHubRepository,
  GITHUB_USER_MAX_CONCURRENT,
  GITHUB_USER_MAX_REQUESTS,
  resetGitHubUserRateLimiter,
} from "@server/github";
import { assert, beforeEach, expect, test, vi } from "vite-plus/test";
import type { CloudContext } from "void";

import { GET } from "../routes/api/github/repository";
import { createRepoFixture } from "./fixtures/repository";

const serverEnv = vi.hoisted(() => ({ GITHUB_TOKEN: undefined as string | undefined }));
vi.mock("void/env", () => ({ env: serverEnv }));

beforeEach(() => {
  clearCommitDetailsCache();
  clearServerGitHubCache();
  resetGitHubUserRateLimiter();
  serverEnv.GITHUB_TOKEN = undefined;
});

async function callRepositoryRoute(url: URL, signedIn: boolean | string = true) {
  assert.equal(url.pathname, "/api/github/repository");
  const headers = new Headers();
  const user =
    typeof signedIn === "string" ? { id: signedIn } : signedIn ? { id: "student" } : null;
  const response = await GET({
    get: (key: string) => (key === "user" ? user : null),
    header: (key: string, value: string) => headers.set(key, value),
    req: { query: (key: string) => url.searchParams.get(key) ?? undefined },
    json: (data: unknown, status = 200) => Response.json(data, { status, headers }),
  } as unknown as CloudContext);
  assert.instanceOf(response, Response);
  return response;
}

test("the dashboard uses the authenticated course API and only the server supplies credentials", async () => {
  let signedIn = false;
  const fixture = createRepoFixture();
  const branch = "feature/issue-42";
  const requests: string[] = [];
  using transport = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, "https://course.example");
    if (url.origin === "https://course.example") {
      assert.deepEqual(
        [...url.searchParams],
        [
          ["repo", "owner/repo"],
          ["branch", branch],
        ],
      );
      assert.isUndefined(init);
      const response = await callRepositoryRoute(url, signedIn);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      assert.notInclude(await response.clone().text(), "fixture-secret");
      return response;
    }
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fixture-secret");
    requests.push(url.pathname);
    if (url.pathname === "/repos/owner/repo") return Response.json(fixture.repo);
    if (url.pathname.includes("/trees/")) return Response.json({ tree: fixture.fileTree });
    if (url.pathname.endsWith("/languages")) return Response.json(fixture.languages);
    return Response.json([]);
  });
  const load = () => fetchGitHubProjectBundle("https://github.com/owner/repo", branch);
  await expect(load()).rejects.toMatchObject({ status: 401 });
  signedIn = true;
  await expect(load()).rejects.toThrow("github.errors.notConfigured");
  assert.isEmpty(requests);
  serverEnv.GITHUB_TOKEN = "fixture-secret";
  try {
    const bundle = await load();
    assert.equal(bundle.selectedBranch, branch);
    assert.deepEqual(bundle.fileTree, fixture.fileTree);
    assert.lengthOf(requests, 6);
  } finally {
    serverEnv.GITHUB_TOKEN = undefined;
  }
  assert.isTrue(transport.mock.calls.length > requests.length);
});

function withGitHubTransport({ fetch }: { fetch: typeof globalThis.fetch }) {
  return (rawUrl: string, branch?: string) =>
    fetchGitHubRepository(rawUrl, { token: "test-token", branch, fetch });
}

test("repository URL parsing retains supported URL and shorthand forms", () => {
  for (const input of [
    " owner/repo ",
    "https://www.github.com/owner/repo.git",
    "https://github.com/owner/repo.git",
    "github.com/owner/repo/",
    "owner/repo/tree/main",
    "https://github.com/owner/repo/tree/main",
  ]) {
    assert.deepEqual(parseGitHubRepoUrl(input), {
      owner: "owner",
      repo: "repo",
      fullKey: "owner/repo",
    });
  }
  assert.strictEqual(parseGitHubRepoUrl("owner"), null);
  assert.strictEqual(parseGitHubRepoUrl(""), null);
  for (const input of [
    "https://example.com/owner/repo",
    "https://github.com/owner",
    "owner/..",
    "owner/.",
    "owner/.git",
    "owner/%2f",
    "owner/repo?q=x",
    "owner/repo/tree/main?q=x",
    "https://github.com/owner/repo/?q=x",
    "owner/repo#readme",
    "owner/repo/tree/main#readme",
    "owner/repo/foo bar",
    `https://github.com/owner/${"a".repeat(300)}`,
  ])
    assert.isNull(parseGitHubRepoUrl(input));
});

test("the server keeps authenticated redirects on the GitHub API origin", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
    assert.equal(init?.redirect, "manual");
    return Response.redirect("https://example.com/elsewhere", 302);
  });
  await expect(
    fetchGitHubRepository("owner/repo", { token: "test-token", fetch }),
  ).rejects.toMatchObject({ status: 502 });
  assert.lengthOf(fetch.mock.calls, 1);
});

test("invalid input has a translation key and performs no I/O", async () => {
  const service = withGitHubTransport({
    fetch: async () => {
      assert.fail("unexpected network request");
    },
  });
  await expect(service("invalid")).rejects.toMatchObject({
    message: "github.errors.invalidUrl",
  });
});

test("former teaching repository uses the GitHub API", async () => {
  let requested = "";
  const service = withGitHubTransport({
    fetch: async (input) => {
      requested = new Request(input).url;
      return new Response(null, { status: 404 });
    },
  });
  await expect(service("student-team/course-oj-platform")).rejects.toMatchObject({
    message: "github.errors.notFound",
  });
  assert.strictEqual(requested, "https://api.github.com/repos/student-team/course-oj-platform");
});

test("live loading preserves headers, branch encoding, rate limits, full file tree and total commits without eager diff requests", async () => {
  const snapshot = createRepoFixture();
  const summaries = snapshot.commits.map(({ files: _files, stats: _stats, ...summary }) => summary);
  const requests: Array<{ url: string; headers: HeadersInit | undefined }> = [];
  const repo = { ...snapshot.repo, default_branch: "feature/a b" };
  const files = Array.from({ length: 300 }, (_, i) => ({
    path: `${i}.ts`,
    type: "blob",
    size: i,
  }));
  const service = withGitHubTransport({
    fetch: async (input, init) => {
      const url = new Request(input).url;
      requests.push({ url: url, headers: init?.headers });
      assert.ok(!url.includes("/commits/"), "initial load must not request commit details");
      const data =
        requests.length === 1
          ? { ...repo, temp_clone_token: "upstream-only", permissions: { admin: true } }
          : url.endsWith("/languages")
            ? { TypeScript: 100 }
            : url.includes("/branches?")
              ? snapshot.branches
              : url.includes("/tags?")
                ? snapshot.tags
                : url.includes("/pulls?")
                  ? snapshot.pulls
                  : url.includes("/commits?")
                    ? summaries
                    : { tree: files };
      return Response.json(data, {
        headers: { "x-ratelimit-remaining": "42", "x-ratelimit-limit": "60" },
      });
    },
  });
  const result = await service("facebook/react");
  assert.strictEqual(requests.length, 6);
  for (const request of requests)
    assert.deepEqual(request.headers, {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer test-token",
      "User-Agent": "Course-Assignment-Platform",
    });
  assert.ok(requests.some((r) => r.url.includes("sha=feature%2Fa%20b")));
  assert.ok(requests.some((r) => r.url.includes("/trees/feature%2Fa%20b?recursive=1")));
  assert.deepEqual(result, {
    repo,
    selectedBranch: repo.default_branch,
    languages: { TypeScript: 100 },
    branches: snapshot.branches,
    totalBranches: snapshot.branches.length,
    hasMoreBranches: false,
    tags: [],
    totalTags: snapshot.tags!.length,
    pulls: [],
    totalPulls: 0,
    openIssuesCount: 0,
    commits: summaries,
    totalCommits: summaries.length,
    fileTree: files,
    sourceType: "live-api",
    rateLimit: "42/60",
  });

  const paginatedRequests: string[] = [];
  const paginatedService = withGitHubTransport({
    fetch: async (input) => {
      const url = new Request(input).url;
      paginatedRequests.push(url);
      if (url.includes("/commits?") && url.includes("per_page=10")) {
        return Response.json(summaries, {
          headers: {
            link: '<https://api.github.com/repos/facebook/react/commits?sha=feature%2Fa%20b&per_page=10&page=2>; rel="next", <https://api.github.com/repos/facebook/react/commits?sha=feature%2Fa%20b&per_page=10&page=3>; rel="last"',
          },
        });
      }
      if (url.includes("/commits?") && url.includes("per_page=1")) {
        return Response.json(summaries.slice(0, 1), {
          headers: {
            link: '<https://api.github.com/repos/facebook/react/commits?sha=feature%2Fa%20b&per_page=1&page=27>; rel="next", <https://api.github.com/repos/facebook/react/commits?sha=feature%2Fa%20b&per_page=1&page=27>; rel="last"',
          },
        });
      }
      if (url.includes("/trees/")) return Response.json({ tree: files });
      if (url.endsWith("/languages")) return Response.json({});
      if (url.includes("/branches?") || url.includes("/tags?") || url.includes("/pulls?"))
        return Response.json([]);
      return Response.json(repo);
    },
  });
  const paginatedResult = await paginatedService("facebook/react");
  assert.strictEqual(paginatedRequests.length, 7);
  assert.strictEqual(paginatedResult.totalCommits, 27);
  assert.strictEqual(paginatedResult.commits.length, summaries.length);
  assert.strictEqual(paginatedResult.fileTree.length, 300);
});

test("commit detail failures report diffError without looping across pages", async () => {
  const snapshot = createRepoFixture();
  const [first, second] = snapshot.commits;
  for (const failure of ["http", "network", "invalid", "later-page"] as const) {
    const details = await fetchServerCommitDetails("facebook/react", first.sha, {
      token: "test-token",
      page: failure === "later-page" ? 2 : 1,
      fetch: async (input) => {
        const url = new Request(input).url;
        if (failure === "later-page" && url.endsWith("page=1")) {
          return Response.json(first, {
            headers: { link: '<https://api.github.com/next>; rel="next"' },
          });
        }
        if (failure === "network") throw new Error("offline");
        if (failure === "invalid") return Response.json({ sha: first.sha });
        return new Response(null, { status: 403 });
      },
    });
    assert.strictEqual(details.sha, first.sha);
    assert.ok(details.diffError);
    assert.strictEqual(details.files, undefined);
  }

  const okDetails = await fetchServerCommitDetails("facebook/react", second.sha, {
    token: "test-token",
    fetch: async () => Response.json(second),
  });
  assert.deepEqual(okDetails, {
    sha: second.sha,
    stats: second.stats,
    files: second.files,
  });
});

test("commit detail pagination fetches one page by default and loads more pages on demand", async () => {
  const snapshot = createRepoFixture();
  const { files, stats, ...summary } = snapshot.commits[0];
  const pages: string[] = [];
  const transport: typeof globalThis.fetch = async (input, init) => {
    const url = new Request(input).url;
    pages.push(url);
    assert.strictEqual(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
    const currentPage = new URL(url).searchParams.get("page");
    return Response.json(
      {
        ...summary,
        ...(currentPage === "1" ? { stats } : {}),
        files: currentPage === "1" ? files!.slice(0, 1) : files!.slice(1),
      },
      {
        headers:
          currentPage === "1"
            ? {
                link: '<https://api.github.com/unused?page=2>; rel="next", <https://api.github.com/unused?page=2>; rel="last"',
              }
            : {},
      },
    );
  };

  const pageOne = await fetchServerCommitDetails("facebook/react", summary.sha, {
    token: "test-token",
    fetch: transport,
  });
  assert.deepEqual(pages, [
    `https://api.github.com/repos/facebook/react/commits/${summary.sha}?per_page=100&page=1`,
  ]);
  assert.deepEqual(pageOne.files, files!.slice(0, 1));
  assert.deepEqual(pageOne.stats, stats);
  assert.strictEqual(pageOne.hasMoreFiles, true);
  assert.strictEqual(pageOne.diffError, undefined);

  const pageTwo = await fetchServerCommitDetails("facebook/react", summary.sha, {
    token: "test-token",
    page: 2,
    fetch: transport,
  });
  assert.deepEqual(
    pages,
    [1, 2].map(
      (page) =>
        `https://api.github.com/repos/facebook/react/commits/${summary.sha}?per_page=100&page=${page}`,
    ),
  );
  assert.deepEqual(pageTwo.files, files!.slice(1));
  assert.strictEqual(pageTwo.hasMoreFiles, undefined);
  assert.strictEqual(pageTwo.diffError, undefined);
});

test("server commit pagination and client commit detail caching work through the API route", async () => {
  const snapshot = createRepoFixture();
  const [first, second] = snapshot.commits;
  const pageTwo = Array.from({ length: 10 }, (_, idx) => ({
    ...second,
    sha: `${idx}`.repeat(40).slice(0, 40),
  }));

  const serverPage = await fetchServerCommitsPage("owner/repo", {
    token: "test-token",
    branch: "feature/a b",
    page: 2,
    fetch: async (input) => {
      const url = new Request(input).url;
      assert.strictEqual(
        url,
        "https://api.github.com/repos/owner/repo/commits?sha=feature%2Fa%20b&per_page=10&page=2",
      );
      return Response.json(pageTwo, {
        headers: {
          link: '<https://api.github.com/repos/owner/repo/commits?page=3>; rel="next"',
        },
      });
    },
  });
  assert.strictEqual(serverPage.hasMore, true);
  assert.strictEqual(serverPage.commits.length, 10);

  clearCommitDetailsCache();
  serverEnv.GITHUB_TOKEN = "fixture-secret";
  const githubRequests: string[] = [];
  using transport = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input, "https://course.example");
    if (url.origin === "https://course.example") {
      return callRepositoryRoute(url);
    }
    githubRequests.push(url.pathname + url.search);
    if (url.pathname.endsWith(`/commits/${first.sha}`)) {
      return Response.json(first);
    }
    if (url.pathname.endsWith("/commits")) {
      return Response.json([second]);
    }
    return new Response(null, { status: 404 });
  });

  try {
    const clientPage = await fetchGitHubCommitsPage("https://github.com/owner/repo", "main", 2);
    assert.strictEqual(clientPage.hasMore, false);
    assert.strictEqual(clientPage.commits.length, 1);

    const firstFetch = await fetchGitHubCommitDetails("https://github.com/owner/repo", first.sha);
    assert.deepEqual(firstFetch, {
      sha: first.sha,
      stats: first.stats,
      files: first.files,
    });
    assert.deepEqual(getCachedCommitDetails("owner/repo", first.sha), firstFetch);

    const callsBeforeCachedHit = transport.mock.calls.length;
    const secondFetch = await fetchGitHubCommitDetails("owner/repo", first.sha);
    assert.deepEqual(secondFetch, firstFetch);
    assert.strictEqual(transport.mock.calls.length, callsBeforeCachedHit);

    const failedFetch = await fetchGitHubCommitDetails("owner/repo", "f".repeat(40));
    assert.ok(failedFetch.diffError);
    assert.strictEqual(getCachedCommitDetails("owner/repo", "f".repeat(40)), undefined);

    const pagedSecondFetch = await fetchGitHubCommitDetails("owner/repo", first.sha, 2);
    assert.deepEqual(pagedSecondFetch, {
      sha: first.sha,
      stats: first.stats,
      files: first.files,
    });
    assert.deepEqual(getCachedCommitDetails("owner/repo", first.sha, 2), pagedSecondFetch);
    assert.strictEqual(githubRequests.length, 4);
    assert.isTrue(githubRequests.some((entry) => entry.endsWith("page=2")));
  } finally {
    clearCommitDetailsCache();
    serverEnv.GITHUB_TOKEN = undefined;
  }
});

test("branch history keeps the first page and estimates the total when the count request fails", async () => {
  const { commits } = createRepoFixture();
  const snapshot = await fetchServerBranchSnapshot("owner/repo", "main", {
    token: "test-token",
    fetch: async (input) => {
      const url = new URL(new Request(input).url);
      if (url.pathname.includes("/git/trees/")) return Response.json({ tree: [] });
      if (url.searchParams.get("per_page") === "1") throw new Error("Count unavailable");
      return Response.json(commits, {
        headers: {
          link: '<https://api.github.com/commits?page=2>; rel="next", <https://api.github.com/commits?page=3>; rel="last"',
        },
      });
    },
  });
  assert.deepEqual(snapshot.commits, commits);
  assert.strictEqual(snapshot.totalCommits, 21);
});

test("secondary endpoint failures yield empty sections without replacing live metadata", async () => {
  const snapshot = createRepoFixture();
  let calls = 0;
  const service = withGitHubTransport({
    fetch: async (_url, init) => {
      assert.strictEqual(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
      calls++;
      if (calls === 1) return Response.json({ ...snapshot.repo, open_issues_count: 5 });
      if (calls === 2) throw new Error("offline");
      if (calls === 3) return new Response(null, { status: 403 });
      return Response.json({ unexpected: true });
    },
  });
  const result = await service("facebook/react");
  assert.strictEqual(result.sourceType, "live-api");
  assert.strictEqual(result.rateLimit, "Live API");
  assert.strictEqual(result.totalBranches, 0);
  assert.strictEqual(result.hasMoreBranches, false);
  assert.strictEqual(result.totalTags, 0);
  assert.strictEqual(result.totalPulls, undefined);
  assert.strictEqual(result.openIssuesCount, 5);
  assert.deepEqual(
    [result.languages, result.branches, result.tags, result.pulls, result.commits, result.fileTree],
    [{}, [], [], [], [], []],
  );
});

test("branch-only snapshots fetch only commits and file tree through the API route", async () => {
  const fixture = createRepoFixture();
  const summaries = fixture.commits.map(({ files: _files, stats: _stats, ...summary }) => summary);
  const branch = "feature/a b";
  const upstreamPaths: string[] = [];
  let paginatedCommits = false;

  serverEnv.GITHUB_TOKEN = "fixture-secret";
  using _transport = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, "https://course.example");
    if (url.origin === "https://course.example") {
      return callRepositoryRoute(url);
    }
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fixture-secret");
    upstreamPaths.push(url.pathname + url.search);
    if (url.pathname.endsWith("/commits")) {
      if (paginatedCommits && url.searchParams.get("per_page") === "10") {
        return Response.json(summaries, {
          headers: {
            link: '<https://api.github.com/repos/owner/repo/commits?page=2>; rel="next", <https://api.github.com/repos/owner/repo/commits?page=3>; rel="last"',
            "x-ratelimit-remaining": "40",
            "x-ratelimit-limit": "60",
          },
        });
      }
      if (paginatedCommits && url.searchParams.get("per_page") === "1") {
        return Response.json(summaries.slice(0, 1), {
          headers: {
            link: '<https://api.github.com/repos/owner/repo/commits?page=23>; rel="next", <https://api.github.com/repos/owner/repo/commits?page=23>; rel="last"',
            "x-ratelimit-remaining": "39",
            "x-ratelimit-limit": "60",
          },
        });
      }
      return Response.json(summaries, {
        headers: { "x-ratelimit-remaining": "41", "x-ratelimit-limit": "60" },
      });
    }
    if (url.pathname.includes("/git/trees/")) {
      return Response.json(
        { tree: fixture.fileTree },
        { headers: { "x-ratelimit-remaining": "41", "x-ratelimit-limit": "60" } },
      );
    }
    assert.fail(`unexpected repo-level request: ${url.pathname}`);
  });

  try {
    const snapshot = await fetchGitHubBranchSnapshot("https://github.com/owner/repo", branch);
    assert.deepEqual(snapshot, {
      selectedBranch: branch,
      commits: summaries,
      totalCommits: summaries.length,
      fileTree: fixture.fileTree,
      rateLimit: "41/60",
    });
    assert.deepEqual(upstreamPaths.toSorted(), [
      "/repos/owner/repo/commits?sha=feature%2Fa%20b&per_page=10",
      "/repos/owner/repo/git/trees/feature%2Fa%20b?recursive=1",
    ]);

    upstreamPaths.length = 0;
    paginatedCommits = true;
    const paginatedSnapshot = await fetchGitHubBranchSnapshot("owner/repo", branch);
    assert.strictEqual(paginatedSnapshot.totalCommits, 23);
    assert.lengthOf(upstreamPaths, 3);

    await expect(fetchGitHubBranchSnapshot("owner/repo", "   ")).rejects.toThrow(
      "github.errors.invalidUrl",
    );

    const invalidScopeRes = await fetch(
      "https://course.example/api/github/repository?repo=owner/repo&branch=main&scope=other",
    );
    assert.strictEqual(invalidScopeRes.status, 400);
    assert.deepEqual(await invalidScopeRes.json(), { error: "github.errors.invalidUrl" });

    const missingBranchRes = await fetch(
      "https://course.example/api/github/repository?repo=owner/repo&scope=branch",
    );
    assert.strictEqual(missingBranchRes.status, 400);
    assert.deepEqual(await missingBranchRes.json(), { error: "github.errors.invalidUrl" });
  } finally {
    serverEnv.GITHUB_TOKEN = undefined;
  }

  for (const [status, key] of [
    [404, "github.errors.notFound"],
    [429, "github.errors.limited"],
  ] as const) {
    for (const failedEndpoint of ["/commits?", "/git/trees/"]) {
      await expect(
        fetchServerBranchSnapshot("owner/repo", "feature/deleted", {
          token: "test-token",
          fetch: async (input) => {
            const url = new Request(input).url;
            if (url.includes(failedEndpoint)) return new Response(null, { status });
            if (url.includes("/git/trees/")) return Response.json({ tree: [] });
            return Response.json([]);
          },
        }),
      ).rejects.toThrow(key);
    }
  }
});

test("repository metrics subtract open PRs from open issues and resolve exact paginated counts", async () => {
  const fixture = createRepoFixture();
  const makePulls = (count: number) =>
    Array.from({ length: count }, (_, idx) => ({ number: idx + 1, state: "open" }));

  // Case 1: 0 issues + 3 open PRs (GitHub reports open_issues_count = 3)
  let requestsCount = 0;
  const zeroIssuesBundle = await withGitHubTransport({
    fetch: async (input) => {
      requestsCount++;
      const url = new Request(input).url;
      if (url.endsWith("/repos/owner/repo"))
        return Response.json({ ...fixture.repo, open_issues_count: 3 });
      if (url.includes("/pulls?state=open&per_page=1")) {
        return Response.json(makePulls(1), {
          headers: {
            link: '<https://api.github.com/pulls?state=open&per_page=1&page=2>; rel="next", <https://api.github.com/pulls?state=open&per_page=1&page=3>; rel="last"',
          },
        });
      }
      if (url.includes("/git/trees/")) return Response.json({ tree: [] });
      if (url.endsWith("/languages")) return Response.json({});
      return Response.json([]);
    },
  })("owner/repo");
  assert.strictEqual(requestsCount, 7);
  assert.strictEqual(zeroIssuesBundle.totalPulls, 3);
  assert.strictEqual(zeroIssuesBundle.openIssuesCount, 0);

  // Case 2: 10 open_issues_count - 2 open PRs = 8 open issues
  const mixedIssuesBundle = await withGitHubTransport({
    fetch: async (input) => {
      const url = new Request(input).url;
      if (url.endsWith("/repos/owner/repo"))
        return Response.json({ ...fixture.repo, open_issues_count: 10 });
      if (url.includes("/pulls?state=open&per_page=1")) {
        return Response.json(makePulls(1), {
          headers: {
            link: '<https://api.github.com/pulls?state=open&per_page=1&page=2>; rel="next", <https://api.github.com/pulls?state=open&per_page=1&page=2>; rel="last"',
          },
        });
      }
      if (url.includes("/git/trees/")) return Response.json({ tree: [] });
      if (url.endsWith("/languages")) return Response.json({});
      return Response.json([]);
    },
  })("owner/repo");
  assert.strictEqual(mixedIssuesBundle.totalPulls, 2);
  assert.strictEqual(mixedIssuesBundle.openIssuesCount, 8);

  // Case 3: Paginated branches (>30), tags, and pulls using per_page=1 count lookups directly
  const paginatedBranches = Array.from({ length: 30 }, (_, idx) => ({
    name: `branch-${idx}`,
    protected: false,
    commit: { sha: "a".repeat(40) },
  }));
  const paginatedTags = Array.from({ length: 1 }, (_, idx) => ({
    name: `v1.0.${idx}`,
    commit: { sha: "a".repeat(40) },
  }));
  const caseThreeUrls: string[] = [];
  const paginatedBundle = await withGitHubTransport({
    fetch: async (input) => {
      const url = new Request(input).url;
      caseThreeUrls.push(url);
      if (url.endsWith("/repos/owner/repo"))
        return Response.json({ ...fixture.repo, open_issues_count: 120 });
      if (url.includes("/branches?per_page=30")) {
        return Response.json(paginatedBranches, {
          headers: { link: '<https://api.github.com/branches?per_page=30&page=2>; rel="next"' },
        });
      }
      if (url.includes("/branches?per_page=1")) {
        return Response.json(paginatedBranches.slice(0, 1), {
          headers: {
            link: '<https://api.github.com/branches?per_page=1&page=100>; rel="last"',
          },
        });
      }
      if (url.includes("/tags?per_page=1")) {
        return Response.json(paginatedTags, {
          headers: {
            link: '<https://api.github.com/tags?per_page=1&page=2>; rel="next", <https://api.github.com/tags?per_page=1&page=64>; rel="last"',
          },
        });
      }
      if (url.includes("/pulls?state=open&per_page=1")) {
        return Response.json(makePulls(1), {
          headers: {
            link: '<https://api.github.com/pulls?state=open&per_page=1&page=2>; rel="next", <https://api.github.com/pulls?state=open&per_page=1&page=45>; rel="last"',
          },
        });
      }
      if (url.includes("/git/trees/")) return Response.json({ tree: [] });
      if (url.endsWith("/languages")) return Response.json({});
      return Response.json([]);
    },
  })("owner/repo");
  assert.strictEqual(caseThreeUrls.length, 8);
  assert.isFalse(caseThreeUrls.some((url) => url.includes("/tags?per_page=30")));
  assert.isFalse(caseThreeUrls.some((url) => url.includes("/pulls?state=open&per_page=30")));
  assert.strictEqual(paginatedBundle.totalBranches, 100);
  assert.strictEqual(paginatedBundle.hasMoreBranches, true);
  assert.strictEqual(paginatedBundle.totalTags, 64);
  assert.strictEqual(paginatedBundle.totalPulls, 45);
  assert.strictEqual(paginatedBundle.openIssuesCount, 75);

  // Case 4: Paginated pulls when per_page=1 count request fails -> falls back without subtracting
  const fallbackBundle = await withGitHubTransport({
    fetch: async (input) => {
      const url = new Request(input).url;
      if (url.endsWith("/repos/owner/repo"))
        return Response.json({ ...fixture.repo, open_issues_count: 120 });
      if (url.includes("/pulls?state=open&per_page=1")) {
        return new Response(null, { status: 500 });
      }
      if (url.includes("/git/trees/")) return Response.json({ tree: [] });
      if (url.endsWith("/languages")) return Response.json({});
      return Response.json([]);
    },
  })("owner/repo");
  assert.strictEqual(fallbackBundle.totalPulls, undefined);
  assert.strictEqual(fallbackBundle.openIssuesCount, 120);
  assert.ok(!("hasMorePulls" in fallbackBundle));

  // Case 5: Paginated pulls missing rel="last" link -> exact is false, falls back without subtracting
  const missingLastBundle = await withGitHubTransport({
    fetch: async (input) => {
      const url = new Request(input).url;
      if (url.endsWith("/repos/owner/repo"))
        return Response.json({ ...fixture.repo, open_issues_count: 120 });
      if (url.includes("/pulls?state=open&per_page=1")) {
        return Response.json(makePulls(1), {
          headers: { link: '<https://api.github.com/pulls?page=2>; rel="next"' },
        });
      }
      if (url.includes("/git/trees/")) return Response.json({ tree: [] });
      if (url.endsWith("/languages")) return Response.json({});
      return Response.json([]);
    },
  })("owner/repo");
  assert.strictEqual(missingLastBundle.totalPulls, 1);
  assert.strictEqual(missingLastBundle.openIssuesCount, 120);
});

test("branch list pagination works through the API route", async () => {
  const pageTwo = Array.from({ length: 30 }, (_, idx) => ({
    name: `release-${idx}`,
    protected: false,
    commit: { sha: "b".repeat(40) },
  }));

  const serverHasMore = await fetchServerBranchesPage("owner/repo", {
    token: "test-token",
    page: 2,
    fetch: async (input) => {
      assert.strictEqual(
        new Request(input).url,
        "https://api.github.com/repos/owner/repo/branches?per_page=30&page=2",
      );
      return Response.json(pageTwo, {
        headers: { link: '<https://api.github.com/repos/owner/repo/branches?page=3>; rel="next"' },
      });
    },
  });
  assert.strictEqual(serverHasMore.hasMore, true);
  assert.strictEqual(serverHasMore.branches.length, 30);

  const serverExactEnd = await fetchServerBranchesPage("owner/repo", {
    token: "test-token",
    page: 3,
    fetch: async () => Response.json(pageTwo),
  });
  assert.strictEqual(serverExactEnd.hasMore, false);
  assert.strictEqual(serverExactEnd.branches.length, 30);

  serverEnv.GITHUB_TOKEN = "fixture-secret";
  using _transport = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input, "https://course.example");
    if (url.origin === "https://course.example") {
      return callRepositoryRoute(url);
    }
    assert.strictEqual(
      url.href,
      "https://api.github.com/repos/owner/repo/branches?per_page=30&page=2",
    );
    return Response.json(pageTwo.slice(0, 5));
  });

  try {
    const clientPage = await fetchGitHubBranchesPage("https://github.com/owner/repo", 2);
    assert.strictEqual(clientPage.hasMore, false);
    assert.strictEqual(clientPage.branches.length, 5);

    await expect(fetchGitHubBranchesPage("owner/repo", 0)).rejects.toThrow(
      "github.errors.invalidUrl",
    );

    const missingPageRes = await fetch(
      "https://course.example/api/github/repository?repo=owner/repo&scope=branches",
    );
    assert.strictEqual(missingPageRes.status, 400);
    assert.deepEqual(await missingPageRes.json(), { error: "github.errors.invalidUrl" });
  } finally {
    serverEnv.GITHUB_TOKEN = undefined;
  }
});

test("switching branches rejects a failed tree or history request", async () => {
  const snapshot = createRepoFixture();
  for (const failedEndpoint of ["/commits?", "/git/trees/"]) {
    const service = withGitHubTransport({
      fetch: async (input) => {
        const url = new Request(input).url;
        if (url.includes(failedEndpoint)) return new Response(null, { status: 404 });
        if (url.includes("/git/trees/")) return Response.json({ tree: [] });
        if (url.endsWith("/repo")) return Response.json(snapshot.repo);
        return Response.json([]);
      },
    });
    await expect(service("owner/repo", "feature/deleted")).rejects.toThrow(
      "github.errors.notFound",
    );
  }
});

test("HTTP and transport errors propagate without substituting repository data", async () => {
  for (const repo of ["facebook/react", "unknown/repo"]) {
    for (const status of [403, 404, 429, 500]) {
      const service = withGitHubTransport({
        fetch: async () => new Response(null, { status }),
      });
      await expect(service(repo)).rejects.toMatchObject({
        status: status === 429 || status === 404 ? status : 502,
      });
    }
    const service = withGitHubTransport({
      fetch: async () => {
        throw new Error("offline");
      },
    });
    await expect(service(repo)).rejects.toMatchObject({ message: "offline" });
  }
});

test("private and internal repositories are rejected before secondary fetches and negative-cached across sub-endpoints", async () => {
  const snapshot = createRepoFixture();
  const sha = snapshot.commits[0].sha;

  const privateUrls: string[] = [];
  const privateFetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const url = new Request(input).url;
    privateUrls.push(url);
    return Response.json({ ...snapshot.repo, full_name: "owner/private-repo", private: true });
  });

  await expect(
    fetchGitHubRepository("owner/private-repo", { token: "test-token", fetch: privateFetch }),
  ).rejects.toMatchObject({ status: 404, message: "github.errors.notFound" });
  assert.deepEqual(privateUrls, ["https://api.github.com/repos/owner/private-repo"]);

  await expect(
    fetchServerBranchSnapshot("owner/private-repo", "main", {
      token: "test-token",
      fetch: privateFetch,
    }),
  ).rejects.toMatchObject({ status: 404, message: "github.errors.notFound" });
  await expect(
    fetchServerBranchesPage("owner/private-repo", {
      token: "test-token",
      page: 1,
      fetch: privateFetch,
    }),
  ).rejects.toMatchObject({ status: 404, message: "github.errors.notFound" });
  await expect(
    fetchServerCommitsPage("owner/private-repo", {
      token: "test-token",
      page: 1,
      fetch: privateFetch,
    }),
  ).rejects.toMatchObject({ status: 404, message: "github.errors.notFound" });
  await expect(
    fetchServerCommitDetails("owner/private-repo", sha, {
      token: "test-token",
      fetch: privateFetch,
    }),
  ).rejects.toMatchObject({ status: 404, message: "github.errors.notFound" });
  assert.strictEqual(privateFetch.mock.calls.length, 1);

  const internalFetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ ...snapshot.repo, private: false, visibility: "internal" }),
  );
  await expect(
    fetchGitHubRepository("owner/internal-repo", { token: "test-token", fetch: internalFetch }),
  ).rejects.toMatchObject({ status: 404, message: "github.errors.notFound" });
  assert.strictEqual(internalFetch.mock.calls.length, 1);

  const scopeCheckUrls: string[] = [];
  const classicScopeFetch: typeof globalThis.fetch = async (input) => {
    const url = new Request(input).url;
    scopeCheckUrls.push(url);
    if (url.endsWith("/repos/owner/hidden-private")) {
      return Response.json({ ...snapshot.repo, full_name: "owner/hidden-private", private: true });
    }
    if (url.includes("/commits/")) {
      return Response.json(snapshot.commits[0], {
        headers: { "x-oauth-scopes": "repo, read:org" },
      });
    }
    return Response.json([]);
  };
  await expect(
    fetchServerCommitDetails("owner/hidden-private", sha, {
      token: "classic-repo-token",
      fetch: classicScopeFetch,
    }),
  ).rejects.toMatchObject({ status: 404, message: "github.errors.notFound" });
  assert.ok(scopeCheckUrls.some((url) => url.endsWith("/repos/owner/hidden-private")));

  const branchScopeUrls: string[] = [];
  const classicBranchFetch: typeof globalThis.fetch = async (input) => {
    const url = new Request(input).url;
    branchScopeUrls.push(url);
    if (url.endsWith("/repos/owner/hidden-branch-private")) {
      return Response.json({
        ...snapshot.repo,
        full_name: "owner/hidden-branch-private",
        private: true,
      });
    }
    if (url.includes("/git/trees/")) {
      return Response.json({ tree: [] }, { headers: { "x-oauth-scopes": "repo" } });
    }
    return Response.json([], { headers: { "x-oauth-scopes": "repo" } });
  };
  await expect(
    fetchServerBranchSnapshot("owner/hidden-branch-private", "main", {
      token: "classic-repo-token",
      fetch: classicBranchFetch,
    }),
  ).rejects.toMatchObject({ status: 404, message: "github.errors.notFound" });
  assert.strictEqual(
    branchScopeUrls.filter((url) => url.endsWith("/repos/owner/hidden-branch-private")).length,
    1,
  );

  const publicScopeUrls: string[] = [];
  const publicScopeDetails = await fetchServerCommitDetails("owner/public-scope-repo", sha, {
    token: "public-only-token",
    fetch: async (input) => {
      const url = new Request(input).url;
      publicScopeUrls.push(url);
      return Response.json(snapshot.commits[0], {
        headers: { "x-oauth-scopes": "public_repo" },
      });
    },
  });
  assert.deepEqual(publicScopeDetails.files, snapshot.commits[0].files);
  assert.strictEqual(publicScopeUrls.length, 1);
});

test("server ETag conditional caching handles 304 Not Modified while preserving Link pagination and updating rate limits", async () => {
  const fixture = createRepoFixture();
  const summaries = fixture.commits.map(({ files: _files, stats: _stats, ...summary }) => summary);
  let phase: "initial" | "revalidated" = "initial";
  const initialIfNoneMatch: Array<string | null> = [];
  const revalidatedIfNoneMatch: Array<string | null> = [];

  const transport: typeof globalThis.fetch = async (input, init) => {
    const url = new Request(input).url;
    const reqHeaders = new Headers(init?.headers);
    const ifNoneMatch = reqHeaders.get("if-none-match");
    if (phase === "initial") {
      initialIfNoneMatch.push(ifNoneMatch);
    } else {
      revalidatedIfNoneMatch.push(ifNoneMatch);
    }

    const etag = `"etag-${new URL(url).pathname}${new URL(url).search}"`;
    if (phase === "revalidated") {
      assert.strictEqual(ifNoneMatch, etag);
      return new Response(null, {
        status: 304,
        headers: {
          etag,
          "x-ratelimit-remaining": "4998",
          "x-ratelimit-limit": "5000",
        },
      });
    }

    const baseHeaders = {
      etag,
      "x-ratelimit-remaining": "4999",
      "x-ratelimit-limit": "5000",
    };
    if (url.endsWith("/repos/owner/etag-repo")) {
      return Response.json(
        { ...fixture.repo, full_name: "owner/etag-repo" },
        { headers: baseHeaders },
      );
    }
    if (url.endsWith("/languages")) {
      return Response.json(fixture.languages, { headers: baseHeaders });
    }
    if (url.includes("/branches?per_page=30")) {
      return Response.json(fixture.branches, { headers: baseHeaders });
    }
    if (url.includes("/tags?per_page=1")) {
      return Response.json(fixture.tags, { headers: baseHeaders });
    }
    if (url.includes("/commits?") && url.includes("per_page=10")) {
      return Response.json(summaries, {
        headers: {
          ...baseHeaders,
          link: '<https://api.github.com/repos/owner/etag-repo/commits?sha=main&per_page=10&page=2>; rel="next", <https://api.github.com/repos/owner/etag-repo/commits?sha=main&per_page=10&page=3>; rel="last"',
        },
      });
    }
    if (url.includes("/commits?") && url.includes("per_page=1")) {
      return Response.json(summaries.slice(0, 1), {
        headers: {
          ...baseHeaders,
          link: '<https://api.github.com/repos/owner/etag-repo/commits?sha=main&per_page=1&page=27>; rel="next", <https://api.github.com/repos/owner/etag-repo/commits?sha=main&per_page=1&page=27>; rel="last"',
        },
      });
    }
    if (url.includes("/git/trees/")) {
      return Response.json({ tree: fixture.fileTree }, { headers: baseHeaders });
    }
    return Response.json([], { headers: baseHeaders });
  };

  const first = await fetchGitHubRepository("owner/etag-repo", {
    token: "test-token",
    fetch: transport,
  });
  assert.isTrue(initialIfNoneMatch.every((value) => value === null));
  assert.strictEqual(first.totalCommits, 27);
  assert.strictEqual(first.rateLimit, "4999/5000");

  phase = "revalidated";
  const second = await fetchGitHubRepository("owner/etag-repo", {
    token: "test-token",
    fetch: transport,
  });
  assert.strictEqual(revalidatedIfNoneMatch.length, initialIfNoneMatch.length);
  assert.deepEqual(second, { ...first, rateLimit: "4998/5000" });
});

test("server commit detail cache shares immutable SHA responses across users and singleflight coalesces concurrent repo loads", async () => {
  const fixture = createRepoFixture();
  const [firstCommit] = fixture.commits;
  let commitUpstreamHits = 0;
  let failCommit = false;
  const upstreamByPath = new Map<string, number>();

  serverEnv.GITHUB_TOKEN = "fixture-secret";
  using _transport = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input, "https://course.example");
    if (url.origin === "https://course.example") {
      return callRepositoryRoute(url);
    }
    upstreamByPath.set(url.pathname, (upstreamByPath.get(url.pathname) ?? 0) + 1);
    if (url.pathname.endsWith(`/commits/${firstCommit.sha}`)) {
      commitUpstreamHits++;
      return Response.json(firstCommit);
    }
    if (url.pathname.includes("/commits/")) {
      if (failCommit) return new Response(null, { status: 500 });
      return Response.json(fixture.commits[1]);
    }
    if (url.pathname.endsWith("/repos/owner/concurrent-repo")) {
      await Promise.resolve();
      return Response.json({ ...fixture.repo, full_name: "owner/concurrent-repo" });
    }
    if (url.pathname.endsWith("/languages")) {
      await Promise.resolve();
      return Response.json(fixture.languages);
    }
    if (url.pathname.includes("/git/trees/")) {
      await Promise.resolve();
      return Response.json({ tree: fixture.fileTree });
    }
    return Response.json([]);
  });

  const commitRouteUrl = new URL(
    `https://course.example/api/github/repository?repo=owner/repo&commit=${firstCommit.sha}`,
  );
  const resStudent1 = await callRepositoryRoute(commitRouteUrl, "student-1");
  assert.strictEqual(resStudent1.status, 200);
  const resStudent2 = await callRepositoryRoute(commitRouteUrl, "student-2");
  assert.strictEqual(resStudent2.status, 200);
  assert.deepEqual(await resStudent1.json(), await resStudent2.json());
  assert.strictEqual(commitUpstreamHits, 1);

  const retrySha = "c".repeat(40);
  const retryUrl = new URL(
    `https://course.example/api/github/repository?repo=owner/repo&commit=${retrySha}`,
  );
  failCommit = true;
  const failedRes = await callRepositoryRoute(retryUrl, "student-1");
  assert.deepEqual(await failedRes.json(), { sha: retrySha, diffError: true });
  failCommit = false;
  const recoveredRes = await callRepositoryRoute(retryUrl, "student-2");
  const recoveredBody = (await recoveredRes.json()) as { files?: unknown[]; diffError?: boolean };
  assert.strictEqual(recoveredBody.diffError, undefined);
  assert.deepEqual(recoveredBody.files, fixture.commits[1].files);

  upstreamByPath.clear();
  const [bundleA, bundleB] = await Promise.all([
    fetchGitHubRepository("owner/concurrent-repo", { token: "fixture-secret" }),
    fetchGitHubRepository("owner/concurrent-repo", { token: "fixture-secret" }),
  ]);
  assert.deepEqual(bundleA, bundleB);
  assert.strictEqual(upstreamByPath.size, 6);
  for (const count of upstreamByPath.values()) {
    assert.strictEqual(count, 1);
  }
});

test("per-user rate limiter and concurrency limiter protect GET /api/github/repository without affecting other users", async () => {
  let clock = 1_000;
  const limiter = createGitHubUserRateLimiter({
    windowMs: 60_000,
    maxRequests: 3,
    maxConcurrent: 2,
    now: () => clock,
  });

  const l1 = limiter.acquire("u1");
  assert.isTrue(l1.allowed);
  const l2 = limiter.acquire("u1");
  assert.isTrue(l2.allowed);
  const blockedConcurrent = limiter.acquire("u1");
  assert.deepEqual(blockedConcurrent, { allowed: false, retryAfterSeconds: 1 });
  if (l1.allowed) {
    l1.lease.release();
    l1.lease.release();
  }
  const l3 = limiter.acquire("u1");
  assert.isTrue(l3.allowed);
  if (l2.allowed) l2.lease.release();
  if (l3.allowed) l3.lease.release();

  clock += 10_000;
  const blockedWindow = limiter.acquire("u1");
  assert.deepEqual(blockedWindow, { allowed: false, retryAfterSeconds: 50 });

  clock += 50_001;
  const allowedAfterWindow = limiter.acquire("u1");
  assert.isTrue(allowedAfterWindow.allowed);
  if (allowedAfterWindow.allowed) allowedAfterWindow.lease.release();

  const fixture = createRepoFixture();
  const sha = fixture.commits[0].sha;
  let releasePending!: () => void;
  const pendingPromise = new Promise<void>((resolve) => {
    releasePending = resolve;
  });
  let upstreamCalls = 0;

  serverEnv.GITHUB_TOKEN = "fixture-secret";
  using _transport = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new Request(input).url;
    upstreamCalls++;
    if (url.includes("hold-")) {
      await pendingPromise;
    }
    return Response.json(fixture.commits[0]);
  });

  const routeUrl = new URL(
    `https://course.example/api/github/repository?repo=owner/repo&commit=${sha}`,
  );
  for (let i = 0; i < GITHUB_USER_MAX_REQUESTS; i++) {
    const res = await callRepositoryRoute(routeUrl, "student-1");
    assert.strictEqual(res.status, 200);
  }
  const callsBeforeLimit = upstreamCalls;
  const rateLimitedRes = await callRepositoryRoute(routeUrl, "student-1");
  assert.strictEqual(rateLimitedRes.status, 429);
  assert.deepEqual(await rateLimitedRes.json(), { error: "github.errors.limited" });
  assert.ok(Number(rateLimitedRes.headers.get("Retry-After")) >= 1);
  assert.strictEqual(upstreamCalls, callsBeforeLimit);

  const invalidRes = await callRepositoryRoute(
    new URL("https://course.example/api/github/repository?repo=invalid"),
    "student-2",
  );
  assert.strictEqual(invalidRes.status, 400);
  for (let i = 0; i < GITHUB_USER_MAX_REQUESTS; i++) {
    const res = await callRepositoryRoute(routeUrl, "student-2");
    assert.strictEqual(res.status, 200);
  }

  const concurrentPromises = Array.from({ length: GITHUB_USER_MAX_CONCURRENT }, (_, idx) =>
    callRepositoryRoute(
      new URL(`https://course.example/api/github/repository?repo=owner/repo&commit=hold-${idx}`),
      "student-3",
    ),
  );
  const seventhConcurrent = await callRepositoryRoute(
    new URL("https://course.example/api/github/repository?repo=owner/repo&commit=hold-extra"),
    "student-3",
  );
  assert.strictEqual(seventhConcurrent.status, 429);
  assert.strictEqual(seventhConcurrent.headers.get("Retry-After"), "1");

  releasePending();
  const settled = await Promise.all(concurrentPromises);
  for (const res of settled) {
    assert.strictEqual(res.status, 200);
  }
  const afterRelease = await callRepositoryRoute(routeUrl, "student-3");
  assert.strictEqual(afterRelease.status, 200);
});
