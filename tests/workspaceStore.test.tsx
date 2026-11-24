import { Buffer } from "node:buffer";

import { workspaceParts, workspaces } from "@db/schema";
import type { PersonalWorkspace } from "@modules/workspace";
import { WORKSPACE_PART_MAX_BYTES, saveWorkspace, splitWorkspaceContent } from "@server/workspaces";
import { assert, beforeEach, test, vi } from "vite-plus/test";

type DeleteStatement = { kind: "delete"; table: unknown; condition: unknown };
type InsertSelectStatement = { kind: "insert-select"; table: unknown; query: unknown };
type InsertValuesStatement = { kind: "insert-values"; table: unknown; value: unknown };
type BatchStatement = DeleteStatement | InsertSelectStatement | InsertValuesStatement;

const dbState = vi.hoisted(() => ({
  batch: vi.fn<(statements: BatchStatement[]) => Promise<unknown[]>>(),
  get: vi.fn<(query: unknown) => Promise<unknown>>(),
}));

vi.mock("void/db", () => ({
  and: (...args: unknown[]) => ({ kind: "and", args }),
  desc: (col: unknown) => ({ kind: "desc", col }),
  eq: (left: unknown, right: unknown) => ({ kind: "eq", left, right }),
  notInArray: (col: unknown, values: unknown[]) => ({ kind: "notInArray", col, values }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    kind: "sql",
    strings: [...strings],
    values,
  }),
  db: {
    delete: (table: unknown) => ({
      where: (condition: unknown): DeleteStatement => ({ kind: "delete", table, condition }),
    }),
    insert: (table: unknown) => ({
      select: (query: unknown): InsertSelectStatement => ({
        kind: "insert-select",
        table,
        query,
      }),
      values: (value: unknown): InsertValuesStatement => ({
        kind: "insert-values",
        table,
        value,
      }),
    }),
    batch: (statements: BatchStatement[]) => dbState.batch(statements),
    get: (query: unknown) => dbState.get(query),
  },
}));

beforeEach(() => {
  dbState.batch.mockReset();
  dbState.get.mockReset();
  dbState.batch.mockResolvedValue([]);
  dbState.get.mockResolvedValue({ 1: 1 });
});

test("splitWorkspaceContent handles empty, small, and invalid maxBytes values", () => {
  assert.deepEqual(splitWorkspaceContent(""), [""]);
  assert.deepEqual(splitWorkspaceContent("hello"), ["hello"]);
  for (const invalidMax of [0, -1, 3, 4.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => splitWorkspaceContent("abc", invalidMax), RangeError);
  }
});

test("splitWorkspaceContent respects UTF-8 byte bounds without splitting surrogate pairs", () => {
  const validInputs = [
    "a".repeat(17),
    "é".repeat(9),
    "架構設計文件測試",
    "📚🚀🎉🧪",
    "aé架📚b繁體中文🚀c",
  ];
  for (const input of validInputs) {
    for (const maxBytes of [4, 5, 6, 10]) {
      const chunks = splitWorkspaceContent(input, maxBytes);
      assert.strictEqual(chunks.join(""), input);
      assert.ok(chunks.length >= 1);
      for (const chunk of chunks) {
        assert.ok(chunk.length > 0);
        assert.ok(
          Buffer.byteLength(chunk, "utf8") <= maxBytes,
          `chunk exceeded ${maxBytes} bytes: ${Buffer.byteLength(chunk, "utf8")}`,
        );
        assert.ok(!/[\uD800-\uDBFF]$/.test(chunk), "chunk ended with an unpaired high surrogate");
        assert.ok(!/^[\uDC00-\uDFFF]/.test(chunk), "chunk started with an unpaired low surrogate");
      }
    }
  }

  // Lone surrogates are also bounded safely as 3-byte replacement sequences in UTF-8.
  const loneInput = "a\uD800b\uDC00\uD800";
  for (const maxBytes of [4, 5, 6]) {
    const chunks = splitWorkspaceContent(loneInput, maxBytes);
    assert.strictEqual(chunks.join(""), loneInput);
    for (const chunk of chunks) {
      assert.ok(Buffer.byteLength(chunk, "utf8") <= maxBytes);
    }
  }
});

test("splitWorkspaceContent chunks >1.2 MB CJK text below WORKSPACE_PART_MAX_BYTES", () => {
  const input = "繁".repeat(400_000); // 400k UTF-16 code units = 1,200,000 UTF-8 bytes
  const chunks = splitWorkspaceContent(input);
  assert.strictEqual(chunks.join(""), input);
  assert.ok(chunks.length >= 4);
  for (const chunk of chunks) {
    assert.ok(Buffer.byteLength(chunk, "utf8") <= WORKSPACE_PART_MAX_BYTES);
  }
});

test("saveWorkspace emits separate single-row part inserts bounded by UTF-8 bytes inside db.batch", async () => {
  const draft: PersonalWorkspace = {
    designDoc: "架構📚".repeat(160_000),
    repoUrl: "https://github.com/example/course-project",
    model: {
      format: "codepulse-c4",
      version: 1,
      nodes: [
        {
          id: "n1",
          kind: "system",
          label: "課程平台",
          category: "system",
          parentId: null,
          description: "繁體中文說明🚀".repeat(1_000),
          technology: "TypeScript",
          x: 10,
          y: 20,
        },
      ],
      relationships: [],
    },
  };

  const result = await saveWorkspace("user-1", "proj-1", null, draft);
  assert.strictEqual(result.status, "saved");
  if (result.status !== "saved") return;

  assert.strictEqual(dbState.batch.mock.calls.length, 1);
  const statements = dbState.batch.mock.calls[0][0];
  assert.ok(statements.length >= 6);

  const [deleteStmt, insertWorkspaceStmt, ...partInserts] = statements;
  assert.strictEqual(deleteStmt.kind, "delete");
  assert.strictEqual(deleteStmt.table, workspaces);
  assert.strictEqual(insertWorkspaceStmt.kind, "insert-select");
  assert.strictEqual(insertWorkspaceStmt.table, workspaces);
  assert.ok(partInserts.length >= 4);

  const reassembled: string[] = [];
  for (const [index, stmt] of partInserts.entries()) {
    assert.strictEqual(stmt.kind, "insert-values");
    if (stmt.kind !== "insert-values") return;
    assert.strictEqual(stmt.table, workspaceParts);
    assert.ok(!Array.isArray(stmt.value), "each part insert must be a single-row statement");
    const row = stmt.value as { revision: string; part: number; content: string };
    assert.strictEqual(row.revision, result.revision);
    assert.strictEqual(row.part, index);
    assert.ok(
      Buffer.byteLength(row.content, "utf8") <= WORKSPACE_PART_MAX_BYTES,
      `part ${index} exceeded WORKSPACE_PART_MAX_BYTES`,
    );
    reassembled.push(row.content);
  }

  assert.deepEqual(JSON.parse(reassembled.join("")), draft);
});

test("saveWorkspace maps unique violations to conflict and missing project errors to missing", async () => {
  const draft: PersonalWorkspace = {
    designDoc: "# README",
    repoUrl: "",
    model: { format: "codepulse-c4", version: 1, nodes: [], relationships: [] },
  };

  dbState.batch.mockRejectedValueOnce(new Error("UNIQUE constraint failed: personal_workspace"));
  assert.deepEqual(await saveWorkspace("user-1", "proj-1", "rev-1", draft), {
    status: "conflict",
  });

  dbState.batch.mockRejectedValueOnce(new Error("FOREIGN KEY constraint failed"));
  dbState.get.mockResolvedValueOnce(undefined);
  assert.deepEqual(await saveWorkspace("user-1", "proj-1", null, draft), {
    status: "missing",
  });
});
