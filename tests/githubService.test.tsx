import assert from "node:assert/strict";
import test from "node:test";
import { createGitHubService, parseGitHubRepoUrl } from "@services/github";
import { loadBuiltinRepoSnapshot } from "@services/github/snapshots";

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
  assert.equal(parseGitHubRepoUrl("owner"), null);
  assert.equal(parseGitHubRepoUrl(""), null);
});

test("invalid input has a translation key and performs no I/O", async () => {
  const service = createGitHubService({
    fetch: async () => {
      assert.fail("unexpected network request");
    },
    loadSnapshot: async () => {
      assert.fail("unexpected snapshot request");
    },
  });
  await assert.rejects(service("invalid"), {
    message: "github.errors.invalidUrl",
  });
});

test("teaching repository bypasses HTTP and unknown snapshots retain the teaching fallback", async () => {
  const service = createGitHubService({
    fetch: async () => {
      assert.fail("unexpected network request");
    },
  });
  const result = await service("STUDENT-TEAM/COURSE-OJ-PLATFORM", "secret");
  assert.equal(result.sourceType, "snapshot");
  assert.equal(result.rateLimit, "內建教學專題倉庫");
  assert.deepEqual(
    await loadBuiltinRepoSnapshot("unknown/repo"),
    await loadBuiltinRepoSnapshot("student-team/course-oj-platform"),
  );
  assert.equal(
    (await loadBuiltinRepoSnapshot("facebook/react")).repo.full_name,
    "facebook/react",
  );
});

test("live loading preserves headers, branch encoding, rate limits and the 250-file cap", async () => {
  const snapshot = await loadBuiltinRepoSnapshot("facebook/react");
  const requests: Array<{ url: string; headers: HeadersInit | undefined }> = [];
  const repo = { ...snapshot.repo, default_branch: "feature/a b" };
  const files = Array.from({ length: 300 }, (_, i) => ({
    path: `${i}.ts`,
    type: "blob",
    size: i,
  }));
  const service = createGitHubService({
    fetch: async (url, init) => {
      requests.push({ url: String(url), headers: init?.headers });
      const data =
        requests.length === 1
          ? repo
          : String(url).endsWith("/languages")
            ? { TypeScript: 100 }
            : String(url).includes("/branches?")
              ? snapshot.branches
              : String(url).includes("/commits?")
                ? snapshot.commits.map(
                    ({ files, stats, ...summary }) => summary,
                  )
                : String(url).includes("/commits/")
                  ? snapshot.commits.find((commit) =>
                      String(url).includes(commit.sha),
                    )
                  : { tree: files };
      return Response.json(data, {
        headers: { "x-ratelimit-remaining": "42", "x-ratelimit-limit": "60" },
      });
    },
    loadSnapshot: async () => {
      assert.fail("unexpected fallback");
    },
  });
  const result = await service("facebook/react", "test-token");
  assert.equal(requests.length, 5 + snapshot.commits.length);
  for (const request of requests)
    assert.deepEqual(request.headers, {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer test-token",
    });
  assert.ok(requests.some((r) => r.url.includes("sha=feature%2Fa%20b")));
  assert.ok(
    requests.some((r) => r.url.includes("/trees/feature%2Fa%20b?recursive=1")),
  );
  assert.deepEqual(result, {
    repo,
    languages: { TypeScript: 100 },
    branches: snapshot.branches,
    commits: snapshot.commits,
    fileTree: files.slice(0, 250),
    sourceType: "live-api",
    rateLimit: "42/60",
  });
});

test("commit detail failures preserve live history, successful diffs and partial pages", async () => {
  const snapshot = await loadBuiltinRepoSnapshot("facebook/react");
  for (const failure of ["http", "network", "invalid", "later-page"] as const) {
    const [first, second] = snapshot.commits;
    const summaries = [first, second].map(
      ({ files, stats, ...summary }) => summary,
    );
    const service = createGitHubService({
      fetch: async (input) => {
        const url = String(input);
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
        if (url.includes(`/commits/${second.sha}`))
          return Response.json(second);
        if (url.includes("/commits?")) return Response.json(summaries);
        if (url.includes("/branches?")) return Response.json([]);
        if (url.includes("/trees/")) return Response.json({ tree: [] });
        if (url.endsWith("/languages")) return Response.json({});
        return Response.json(snapshot.repo);
      },
      loadSnapshot: async () => assert.fail("must not replace live repository"),
    });
    const result = await service("facebook/react");
    assert.equal(result.sourceType, "live-api");
    assert.deepEqual(
      result.commits.map((c) => c.sha),
      [first.sha, second.sha],
    );
    assert.ok(result.commits[0].diffError);
    assert.deepEqual(result.commits[1], second);
    assert.deepEqual(
      result.commits[0].files,
      failure === "later-page" ? first.files : undefined,
    );
  }
});

test("commit detail pagination collects files using the same authenticated endpoint", async () => {
  const snapshot = await loadBuiltinRepoSnapshot("facebook/react");
  const { files, stats, ...summary } = snapshot.commits[0];
  const pages: string[] = [];
  const service = createGitHubService({
    fetch: async (input, init) => {
      const url = String(input);
      if (url.includes("/commits/")) {
        pages.push(url);
        assert.equal(
          new Headers(init?.headers).get("Authorization"),
          "Bearer test-token",
        );
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
  const result = await service("facebook/react", "test-token");
  assert.deepEqual(
    pages,
    [1, 2].map(
      (page) =>
        `https://api.github.com/repos/facebook/react/commits/${summary.sha}?per_page=100&page=${page}`,
    ),
  );
  assert.deepEqual(result.commits[0].files, files);
  assert.deepEqual(result.commits[0].stats, stats);
  assert.equal(result.commits[0].diffError, undefined);
});

test("secondary endpoint failures yield empty sections without replacing live metadata", async () => {
  const snapshot = await loadBuiltinRepoSnapshot("facebook/react");
  let calls = 0;
  const service = createGitHubService({
    fetch: async (_url, init) => {
      assert.equal(new Headers(init?.headers).has("Authorization"), false);
      calls++;
      if (calls === 1) return Response.json(snapshot.repo);
      if (calls === 2) throw new Error("offline");
      if (calls === 3) return new Response(null, { status: 403 });
      return Response.json({ unexpected: true });
    },
  });
  const result = await service("facebook/react");
  assert.equal(result.sourceType, "live-api");
  assert.equal(result.rateLimit, "Live API");
  assert.deepEqual(
    [result.languages, result.branches, result.commits, result.fileTree],
    [{}, [], [], []],
  );
});

test("HTTP and transport errors preserve the normalized fallback key and diagnostic", async () => {
  for (const failure of ["http", "network"] as const) {
    let key = "";
    const snapshot = await loadBuiltinRepoSnapshot("facebook/react");
    const service = createGitHubService({
      fetch: async () => {
        if (failure === "network") throw new Error("offline");
        return new Response(null, { status: 403 });
      },
      loadSnapshot: async (value) => {
        key = value;
        return snapshot;
      },
    });
    const result = await service("FACEBOOK/React");
    assert.equal(key, "facebook/react");
    assert.deepEqual(result, {
      ...snapshot,
      sourceType: "fallback-snapshot",
      apiError: failure === "http" ? "HTTP 403" : "offline",
      rateLimit: "內建快照備援",
    });
  }
});
