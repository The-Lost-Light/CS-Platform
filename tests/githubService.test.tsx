import { fetchGitHubProjectBundle, parseGitHubRepoUrl } from "@modules/repository";
import { fetchGitHubRepository } from "@server/github";
import { assert, expect, test, vi } from "vite-plus/test";
import type { CloudContext } from "void";

import { GET } from "../routes/api/github/repository";
import { createRepoFixture } from "./fixtures/repository";

const serverEnv = vi.hoisted(() => ({ GITHUB_TOKEN: undefined as string | undefined }));
vi.mock("void/env", () => ({ env: serverEnv }));

test("the dashboard uses the authenticated course API and only the server supplies credentials", async () => {
  let signedIn = false;
  const fixture = createRepoFixture();
  const branch = "feature/issue-42";
  const requests: string[] = [];
  using transport = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, "https://course.example");
    if (url.origin === "https://course.example") {
      assert.equal(url.pathname, "/api/github/repository");
      assert.deepEqual(
        [...url.searchParams],
        [
          ["repo", "owner/repo"],
          ["branch", branch],
        ],
      );
      assert.isUndefined(init);
      const headers = new Headers();
      const response = await GET({
        get: (key: string) => (key === "user" && signedIn ? { id: "student" } : null),
        header: (key: string, value: string) => headers.set(key, value),
        req: { query: (key: string) => url.searchParams.get(key) ?? undefined },
        json: (data: unknown, status = 200) => Response.json(data, { status, headers }),
      } as unknown as CloudContext);
      assert.instanceOf(response, Response);
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
    assert.lengthOf(requests, 7);
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
    "github.com/owner/repo/",
    "owner/repo/tree/main",
  ]) {
    assert.deepEqual(parseGitHubRepoUrl(input), {
      owner: "owner",
      repo: "repo",
      fullKey: "owner/repo",
    });
  }
  assert.strictEqual(parseGitHubRepoUrl("owner"), null);
  assert.strictEqual(parseGitHubRepoUrl(""), null);
  for (const input of ["https://example.com/owner/repo", "owner/..", "owner/%2f", "owner/repo?q=x"])
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

test("live loading preserves headers, branch encoding, rate limits and the 250-file cap", async () => {
  const snapshot = createRepoFixture();
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
                    ? snapshot.commits.map(
                        ({ files: _files, stats: _stats, ...summary }) => summary,
                      )
                    : url.includes("/commits/")
                      ? snapshot.commits.find((commit) => url.includes(commit.sha))
                      : { tree: files };
      return Response.json(data, {
        headers: { "x-ratelimit-remaining": "42", "x-ratelimit-limit": "60" },
      });
    },
  });
  const result = await service("facebook/react");
  assert.strictEqual(requests.length, 7 + snapshot.commits.length);
  for (const request of requests)
    assert.deepEqual(request.headers, {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer test-token",
      "User-Agent": "CodePulse-Edu",
    });
  assert.ok(requests.some((r) => r.url.includes("sha=feature%2Fa%20b")));
  assert.ok(requests.some((r) => r.url.includes("/trees/feature%2Fa%20b?recursive=1")));
  assert.deepEqual(result, {
    repo,
    selectedBranch: repo.default_branch,
    languages: { TypeScript: 100 },
    branches: snapshot.branches,
    tags: snapshot.tags,
    pulls: snapshot.pulls,
    commits: snapshot.commits,
    fileTree: files.slice(0, 250),
    sourceType: "live-api",
    rateLimit: "42/60",
  });
});

test("commit detail failures preserve live history, successful diffs and partial pages", async () => {
  const snapshot = createRepoFixture();
  for (const failure of ["http", "network", "invalid", "later-page"] as const) {
    const [first, second] = snapshot.commits;
    const summaries = [first, second].map(
      ({ files: _files, stats: _stats, ...summary }) => summary,
    );
    const service = withGitHubTransport({
      fetch: async (input) => {
        const url = new Request(input).url;
        if (url.includes(`/commits/${first.sha}`)) {
          if (failure === "later-page" && url.endsWith("page=1")) {
            return Response.json(first, {
              headers: { link: '<https://api.github.com/next>; rel="next"' },
            });
          }
          if (failure === "network") throw new Error("offline");
          if (failure === "invalid") return Response.json({ sha: first.sha });
          return new Response(null, { status: 403 });
        }
        if (url.includes(`/commits/${second.sha}`)) return Response.json(second);
        if (url.includes("/commits?")) return Response.json(summaries);
        if (url.includes("/branches?")) return Response.json([]);
        if (url.includes("/trees/")) return Response.json({ tree: [] });
        if (url.endsWith("/languages")) return Response.json({});
        return Response.json(snapshot.repo);
      },
    });
    const result = await service("facebook/react");
    assert.strictEqual(result.sourceType, "live-api");
    assert.deepEqual(
      result.commits.map((c) => c.sha),
      [first.sha, second.sha],
    );
    assert.ok(result.commits[0].diffError);
    assert.deepEqual(result.commits[1], second);
    assert.deepEqual(result.commits[0].files, failure === "later-page" ? first.files : undefined);
  }
});

test("commit detail pagination collects files using the same authenticated endpoint", async () => {
  const snapshot = createRepoFixture();
  const { files, stats, ...summary } = snapshot.commits[0];
  const pages: string[] = [];
  const service = withGitHubTransport({
    fetch: async (input, init) => {
      const url = new Request(input).url;
      if (url.includes("/commits/")) {
        pages.push(url);
        assert.strictEqual(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
        return Response.json(
          {
            ...summary,
            ...(pages.length === 1 ? { stats } : {}),
            files: pages.length === 1 ? files!.slice(0, 1) : files!.slice(1),
          },
          {
            headers:
              pages.length === 1
                ? {
                    link: '<https://api.github.com/unused?page=2>; rel="next", <https://api.github.com/unused?page=2>; rel="last"',
                  }
                : {},
          },
        );
      }
      if (url.includes("/commits?")) return Response.json([summary]);
      if (url.includes("/branches?")) return Response.json([]);
      if (url.includes("/trees/")) return Response.json({ tree: [] });
      if (url.endsWith("/languages")) return Response.json({});
      return Response.json(snapshot.repo);
    },
  });
  const result = await service("facebook/react");
  assert.deepEqual(
    pages,
    [1, 2].map(
      (page) =>
        `https://api.github.com/repos/facebook/react/commits/${summary.sha}?per_page=100&page=${page}`,
    ),
  );
  assert.deepEqual(result.commits[0].files, files);
  assert.deepEqual(result.commits[0].stats, stats);
  assert.strictEqual(result.commits[0].diffError, undefined);
});

test("secondary endpoint failures yield empty sections without replacing live metadata", async () => {
  const snapshot = createRepoFixture();
  let calls = 0;
  const service = withGitHubTransport({
    fetch: async (_url, init) => {
      assert.strictEqual(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
      calls++;
      if (calls === 1) return Response.json(snapshot.repo);
      if (calls === 2) throw new Error("offline");
      if (calls === 3) return new Response(null, { status: 403 });
      return Response.json({ unexpected: true });
    },
  });
  const result = await service("facebook/react");
  assert.strictEqual(result.sourceType, "live-api");
  assert.strictEqual(result.rateLimit, "Live API");
  assert.deepEqual(
    [result.languages, result.branches, result.tags, result.pulls, result.commits, result.fileTree],
    [{}, [], [], [], [], []],
  );
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
