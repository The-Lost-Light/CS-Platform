import {
  C4_FILE_MAX_BYTES,
  C4_MAX_NODES,
  C4_MAX_RELATIONSHIPS,
  C4_NODE_FIELD_LIMITS,
  C4_RELATIONSHIP_FIELD_LIMITS,
} from "@modules/c4-model";
import { readWorkspaceInput } from "@server/workspaces";
import { isValidWorkspaceRepoUrl, resolveWorkspaceRepoUrl } from "@shared/githubRepoUrl";
import { MAX_DESIGN_DOC_LENGTH } from "@shared/workspacePolicy";
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
        model: { format: "cap-c4", version: 1, nodes: [], relationships: [] },
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

test("readWorkspaceInput enforces designDoc and C4 size limits while keeping 413 for oversized payloads", async () => {
  function makeDraftRequest(draft: Record<string, unknown>) {
    return new Request("https://course.example/api/projects/demo/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: null, draft }),
    });
  }

  const baseModel = {
    format: "cap-c4",
    version: 1,
    nodes: [
      {
        id: "n1",
        kind: "system",
        label: "API",
        category: "system",
        parentId: null,
        description: "",
        technology: "",
        x: 0,
        y: 0,
      },
      {
        id: "n2",
        kind: "system",
        label: "DB",
        category: "system",
        parentId: null,
        description: "",
        technology: "",
        x: 200,
        y: 0,
      },
    ],
    relationships: [{ id: "e1", source: "n1", target: "n2", label: "Reads", technology: "SQL" }],
  };

  const acceptedDoc = await readWorkspaceInput(
    makeDraftRequest({
      designDoc: "x".repeat(MAX_DESIGN_DOC_LENGTH),
      repoUrl: "",
      model: baseModel,
    }),
  );
  assert.strictEqual(acceptedDoc.ok, true);
  if (acceptedDoc.ok) {
    assert.strictEqual(acceptedDoc.draft.designDoc.length, MAX_DESIGN_DOC_LENGTH);
  }

  const rejectedDoc = await readWorkspaceInput(
    makeDraftRequest({
      designDoc: "x".repeat(MAX_DESIGN_DOC_LENGTH + 1),
      repoUrl: "",
      model: baseModel,
    }),
  );
  assert.deepEqual(rejectedDoc, { ok: false, error: "invalid" });

  const tooManyNodes = Array.from({ length: C4_MAX_NODES + 1 }, (_, index) => ({
    ...baseModel.nodes[0],
    id: `node-${index}`,
  }));
  assert.deepEqual(
    await readWorkspaceInput(
      makeDraftRequest({
        designDoc: "",
        repoUrl: "",
        model: { ...baseModel, nodes: tooManyNodes, relationships: [] },
      }),
    ),
    { ok: false, error: "invalid" },
  );

  const tooManyEdges = Array.from({ length: C4_MAX_RELATIONSHIPS + 1 }, (_, index) => ({
    id: `edge-${index}`,
    source: "n1",
    target: "n2",
    label: "Uses",
    technology: "",
  }));
  assert.deepEqual(
    await readWorkspaceInput(
      makeDraftRequest({
        designDoc: "",
        repoUrl: "",
        model: { ...baseModel, relationships: tooManyEdges },
      }),
    ),
    { ok: false, error: "invalid" },
  );

  assert.deepEqual(
    await readWorkspaceInput(
      makeDraftRequest({
        designDoc: "",
        repoUrl: "",
        model: {
          ...baseModel,
          nodes: [
            {
              ...baseModel.nodes[0],
              description: "x".repeat(C4_NODE_FIELD_LIMITS.description + 1),
            },
            baseModel.nodes[1],
          ],
        },
      }),
    ),
    { ok: false, error: "invalid" },
  );

  assert.deepEqual(
    await readWorkspaceInput(
      makeDraftRequest({
        designDoc: "",
        repoUrl: "",
        model: {
          ...baseModel,
          relationships: [
            {
              ...baseModel.relationships[0],
              label: "x".repeat(C4_RELATIONSHIP_FIELD_LIMITS.label + 1),
            },
          ],
        },
      }),
    ),
    { ok: false, error: "invalid" },
  );

  const oversizedBody = new Request("https://course.example/api/projects/demo/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "x".repeat(C4_FILE_MAX_BYTES + 1024 * 1024 + 1),
  });
  assert.deepEqual(await readWorkspaceInput(oversizedBody), { ok: false, error: "tooLarge" });
});
