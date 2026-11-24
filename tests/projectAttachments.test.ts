import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { projectAttachmentParts, projectAttachments } from "@db/schema";
import type { Project } from "@modules/projects";
import { downloadProjectAttachment, listProjects, saveProject } from "@server/projects";
import { assert, beforeEach, test, vi } from "vite-plus/test";

type SqlQuery = { sql: string; params: SQLInputValue[] };
type SelectStatement = { toSQL: () => SqlQuery };
type InsertValuesStatement = {
  kind: "insert-values";
  table: unknown;
  value: Record<string, unknown>;
};
type DeleteStatement = { kind: "delete"; table: unknown };
type PlanRow = { detail: string };

const dbState = vi.hoisted(() => ({
  batch: vi.fn<(statements: unknown[]) => Promise<unknown[]>>(),
  select: vi.fn<(statement: SelectStatement) => Promise<unknown[]>>(),
  get: vi.fn<(query: unknown) => Promise<unknown>>(),
}));

function wrapSelectable<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (prop === "then" && "toSQL" in obj && typeof obj.toSQL === "function") {
        const selectStmt = obj as unknown as SelectStatement;
        return (
          onFulfilled?: (rows: unknown[]) => unknown,
          onRejected?: (err: unknown) => unknown,
        ) => dbState.select(selectStmt).then(onFulfilled, onRejected);
      }
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const next = (value as (...inner: unknown[]) => unknown).apply(obj, args);
        return typeof next === "object" && next !== null && "toSQL" in next
          ? wrapSelectable(next)
          : next;
      };
    },
  });
}

vi.mock("void/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("void/db")>();
  const { QueryBuilder } = await import("void/schema-d1");
  const qb = new QueryBuilder();
  return {
    ...actual,
    db: {
      select: (fields?: Record<string, unknown>) =>
        wrapSelectable(fields ? qb.select(fields as never) : qb.select()),
      insert: (table: unknown) => ({
        values: (value: Record<string, unknown>) => ({
          kind: "insert-values" as const,
          table,
          value,
          returning: () => ({ kind: "write" as const, table, value }),
        }),
        select: () => ({
          onConflictDoUpdate: () => ({
            returning: () => ({ kind: "write" as const, table }),
          }),
        }),
      }),
      delete: (table: unknown) => ({
        where: () => ({ kind: "delete" as const, table }),
      }),
      batch: (statements: unknown[]) => dbState.batch(statements),
      get: (query: unknown) => dbState.get(query),
    },
  };
});

function isSelectStatement(statement: unknown): statement is SelectStatement {
  return (
    typeof statement === "object" &&
    statement !== null &&
    "toSQL" in statement &&
    typeof statement.toSQL === "function"
  );
}

function readJournalTags() {
  const journalPath = path.resolve("db/migrations/meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };
  return journal.entries.map((entry) => entry.tag);
}

function applyMigrationTag(sqlite: DatabaseSync, tag: string) {
  const sqlText = readFileSync(path.resolve("db/migrations", `${tag}.sql`), "utf8");
  for (const statement of sqlText.split("--> statement-breakpoint")) {
    const trimmed = statement.trim();
    if (trimmed) sqlite.exec(trimmed);
  }
}

function seedProjects(sqlite: DatabaseSync) {
  const insertProject = sqlite.prepare(
    "INSERT INTO course_project (id, code_name, data, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const baseProject = {
    dueDate: "2026-12-31 23:59",
    points: 100,
    tags: ["Architecture"],
    content: "# Assignment",
  };
  insertProject.run(
    "proj-a",
    "CUSTOM-A",
    JSON.stringify({ id: "proj-a", codeName: "CUSTOM-A", title: "Project A", ...baseProject }),
    "admin-1",
    2000,
  );
  insertProject.run(
    "proj-b",
    "CUSTOM-B",
    JSON.stringify({ id: "proj-b", codeName: "CUSTOM-B", title: "Project B", ...baseProject }),
    "admin-1",
    1000,
  );
  insertProject.run(
    "proj-empty",
    "CUSTOM-EMPTY",
    JSON.stringify({
      id: "proj-empty",
      codeName: "CUSTOM-EMPTY",
      title: "Project Empty",
      ...baseProject,
    }),
    "admin-1",
    500,
  );
}

function createMigratedDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const tag of readJournalTags()) applyMigrationTag(sqlite, tag);
  seedProjects(sqlite);

  const insertAttachment = sqlite.prepare(
    "INSERT INTO project_attachment (project_id, attachment_id, name, size) VALUES (?, ?, ?, ?)",
  );
  const insertPart = sqlite.prepare(
    "INSERT INTO project_attachment_part (project_id, attachment_id, part, content) VALUES (?, ?, ?, ?)",
  );

  insertAttachment.run("proj-a", "att-b", "spec.pdf", 1024);
  insertPart.run("proj-a", "att-b", 0, Buffer.from("PART0_SPEC__").toString("base64"));
  insertPart.run("proj-a", "att-b", 1, Buffer.from("PART1_SPEC__").toString("base64"));
  insertPart.run("proj-a", "att-b", 2, Buffer.from("PART2_SPEC").toString("base64"));

  insertAttachment.run("proj-a", "att-a2", "guide.md", 512);
  insertPart.run("proj-a", "att-a2", 0, Buffer.from("PART0_GUIDE2").toString("base64"));

  insertAttachment.run("proj-a", "att-a1", "guide.md", 256);
  insertPart.run("proj-a", "att-a1", 0, Buffer.from("PART0_GUIDE1").toString("base64"));

  insertAttachment.run("proj-a", "att-zero", "empty.txt", 0);

  insertAttachment.run("proj-b", "att-c", "rubric.txt", 128);
  insertPart.run("proj-b", "att-c", 0, Buffer.from("PART0_RUBRIC").toString("base64"));
  insertPart.run("proj-b", "att-c", 1, Buffer.from("PART1_RUBRIC").toString("base64"));

  return sqlite;
}

beforeEach(() => {
  dbState.batch.mockReset();
  dbState.select.mockReset();
  dbState.get.mockReset();
  dbState.get.mockResolvedValue({ 1: 1 });
});

test("table-split migration preserves existing metadata and chunks while enforcing cascade deletes", () => {
  const tags = readJournalTags();
  const splitTag = tags.at(-1);
  assert.ok(splitTag);

  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  try {
    for (const tag of tags.slice(0, -1)) applyMigrationTag(sqlite, tag);
    seedProjects(sqlite);

    const insertLegacyPart = sqlite.prepare(
      "INSERT INTO project_attachment_part (project_id, attachment_id, part, name, size, content) VALUES (?, ?, ?, ?, ?, ?)",
    );
    insertLegacyPart.run("proj-a", "att-multi", 0, "big.bin", 400000, "AAAA");
    insertLegacyPart.run("proj-a", "att-multi", 1, "big.bin", 400000, "BBBB");
    insertLegacyPart.run("proj-a", "att-empty", 0, "empty.txt", 0, "");
    insertLegacyPart.run("proj-b", "att-other", 0, "doc.pdf", 500, "CCCC");

    sqlite.exec("BEGIN");
    applyMigrationTag(sqlite, splitTag);
    sqlite.exec("COMMIT");

    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);

    const partColumns = (
      sqlite.prepare("PRAGMA table_info(project_attachment_part)").all() as Array<{ name: string }>
    ).map((column) => column.name);
    assert.deepEqual(partColumns, ["project_id", "attachment_id", "part", "content"]);

    const attachments = sqlite
      .prepare(
        "SELECT project_id, attachment_id, name, size FROM project_attachment ORDER BY project_id, attachment_id",
      )
      .all();
    assert.deepEqual(
      attachments.map((row) => ({ ...row })),
      [
        { project_id: "proj-a", attachment_id: "att-empty", name: "empty.txt", size: 0 },
        { project_id: "proj-a", attachment_id: "att-multi", name: "big.bin", size: 400000 },
        { project_id: "proj-b", attachment_id: "att-other", name: "doc.pdf", size: 500 },
      ],
    );

    const parts = sqlite
      .prepare(
        "SELECT project_id, attachment_id, part, content FROM project_attachment_part ORDER BY project_id, attachment_id, part",
      )
      .all();
    assert.deepEqual(
      parts.map((row) => ({ ...row })),
      [
        { project_id: "proj-a", attachment_id: "att-empty", part: 0, content: "" },
        { project_id: "proj-a", attachment_id: "att-multi", part: 0, content: "AAAA" },
        { project_id: "proj-a", attachment_id: "att-multi", part: 1, content: "BBBB" },
        { project_id: "proj-b", attachment_id: "att-other", part: 0, content: "CCCC" },
      ],
    );

    sqlite
      .prepare("DELETE FROM project_attachment WHERE project_id = ? AND attachment_id = ?")
      .run("proj-a", "att-multi");
    assert.deepEqual(
      sqlite
        .prepare(
          "SELECT attachment_id, part FROM project_attachment_part WHERE project_id = 'proj-a'",
        )
        .all()
        .map((row) => ({ ...row })),
      [{ attachment_id: "att-empty", part: 0 }],
    );

    sqlite.prepare("DELETE FROM course_project WHERE id = ?").run("proj-b");
    assert.deepEqual(
      sqlite.prepare("SELECT * FROM project_attachment WHERE project_id = 'proj-b'").all(),
      [],
    );
    assert.deepEqual(
      sqlite.prepare("SELECT * FROM project_attachment_part WHERE project_id = 'proj-b'").all(),
      [],
    );
  } finally {
    sqlite.close();
  }
});

test("listProjects reads attachment metadata via the covering index on project_attachment", async () => {
  const sqlite = createMigratedDb();
  let capturedAttachmentQuery: SqlQuery | undefined;

  dbState.batch.mockImplementationOnce(async (statements) => {
    assert.strictEqual(statements.length, 3);
    assert.ok(statements.every(isSelectStatement));

    const [projectsStmt, attachmentsStmt, removedStmt] = statements;
    const projectsSql = projectsStmt.toSQL();
    const attachmentsSql = attachmentsStmt.toSQL();
    const removedSql = removedStmt.toSQL();
    capturedAttachmentQuery = attachmentsSql;

    const projectRows = sqlite
      .prepare(projectsSql.sql)
      .all(...projectsSql.params)
      .map((row) => ({
        data: JSON.parse(String(row.data)) as Omit<Project, "attachments">,
      }));

    const attachmentRows = sqlite
      .prepare(attachmentsSql.sql)
      .all(...attachmentsSql.params)
      .map((row) => ({
        projectId: String(row.project_id),
        id: String(row.attachment_id),
        name: String(row.name),
        size: Number(row.size),
      }));

    const removedRows = sqlite.prepare(removedSql.sql).all(...removedSql.params);
    return [projectRows, attachmentRows, removedRows];
  });

  try {
    const catalog = await listProjects("en");

    assert.ok(capturedAttachmentQuery);
    assert.deepEqual(capturedAttachmentQuery.params, []);

    const plan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${capturedAttachmentQuery.sql}`)
      .all() as PlanRow[];
    assert.ok(
      plan.some((row) =>
        row.detail.includes(
          "SCAN project_attachment USING COVERING INDEX project_attachment_order_idx",
        ),
      ),
      `Expected covering index in query plan, got: ${JSON.stringify(plan)}`,
    );
    assert.ok(
      plan.every((row) => !row.detail.includes("TEMP B-TREE")),
      `Unexpected TEMP B-TREE sort in query plan: ${JSON.stringify(plan)}`,
    );
    assert.ok(
      plan.every((row) => !row.detail.includes("project_attachment_part")),
      `Unexpected chunk table access in query plan: ${JSON.stringify(plan)}`,
    );

    const projectA = catalog.find((item) => item.id === "proj-a");
    const projectB = catalog.find((item) => item.id === "proj-b");
    const projectEmpty = catalog.find((item) => item.id === "proj-empty");

    assert.deepEqual(projectA?.attachments, [
      { id: "att-zero", name: "empty.txt", size: 0 },
      { id: "att-a1", name: "guide.md", size: 256 },
      { id: "att-a2", name: "guide.md", size: 512 },
      { id: "att-b", name: "spec.pdf", size: 1024 },
    ]);
    assert.deepEqual(projectB?.attachments, [{ id: "att-c", name: "rubric.txt", size: 128 }]);
    assert.deepEqual(projectEmpty?.attachments, []);
  } finally {
    sqlite.close();
  }
});

test("saveProject writes metadata and chunks separately and reads back via covering index seek", async () => {
  const sqlite = createMigratedDb();
  let capturedStatements: unknown[] = [];
  let capturedMetadataQuery: SqlQuery | undefined;

  dbState.batch.mockImplementationOnce(async (statements) => {
    capturedStatements = statements;
    const insertAttachment = sqlite.prepare(
      "INSERT INTO project_attachment (project_id, attachment_id, name, size) VALUES (?, ?, ?, ?)",
    );
    const insertPart = sqlite.prepare(
      "INSERT INTO project_attachment_part (project_id, attachment_id, part, content) VALUES (?, ?, ?, ?)",
    );

    for (const stmt of statements.slice(2, -1) as InsertValuesStatement[]) {
      if (stmt.table === projectAttachments) {
        insertAttachment.run(
          String(stmt.value.projectId),
          String(stmt.value.attachmentId),
          String(stmt.value.name),
          Number(stmt.value.size),
        );
      } else if (stmt.table === projectAttachmentParts) {
        insertPart.run(
          String(stmt.value.projectId),
          String(stmt.value.attachmentId),
          Number(stmt.value.part),
          String(stmt.value.content),
        );
      }
    }

    const lastStmt = statements.at(-1);
    assert.ok(isSelectStatement(lastStmt));
    const metadataSql = lastStmt.toSQL();
    capturedMetadataQuery = metadataSql;

    const attachmentRows = sqlite
      .prepare(metadataSql.sql)
      .all(...metadataSql.params)
      .map((row) => ({
        id: String(row.attachment_id),
        name: String(row.name),
        size: Number(row.size),
      }));

    return [
      [{ id: "proj-empty" }],
      undefined,
      ...statements.slice(2, -1).map(() => undefined),
      attachmentRows,
    ];
  });

  try {
    const bigBytes = new Uint8Array(384 * 1024 + 10).fill(65);
    const bigFile = new File([bigBytes], "bundle.bin", { type: "application/octet-stream" });
    const emptyFile = new File([], "empty.txt", { type: "text/plain" });

    const saved = await saveProject(
      {
        project: {
          codeName: "CUSTOM-EMPTY",
          title: "Project Empty",
          dueDate: "2026-12-31 23:59",
          points: 100,
          tags: ["Architecture"],
          content: "# Updated",
        },
        retained: [],
        uploads: [bigFile, emptyFile],
      },
      "admin-1",
      "proj-empty",
    );

    assert.ok(saved);
    assert.strictEqual((capturedStatements[1] as DeleteStatement).kind, "delete");
    assert.strictEqual((capturedStatements[1] as DeleteStatement).table, projectAttachments);

    const uploadInserts = capturedStatements.slice(2, -1) as InsertValuesStatement[];
    // 1 metadata + 2 chunks for bigFile, plus 1 metadata + 0 chunks for emptyFile
    assert.strictEqual(uploadInserts.length, 4);
    assert.strictEqual(uploadInserts[0].table, projectAttachments);
    assert.strictEqual(uploadInserts[0].value.name, "bundle.bin");
    assert.strictEqual(uploadInserts[1].table, projectAttachmentParts);
    assert.strictEqual(uploadInserts[1].value.part, 0);
    assert.strictEqual("name" in uploadInserts[1].value, false);
    assert.strictEqual("size" in uploadInserts[1].value, false);
    assert.strictEqual(uploadInserts[2].table, projectAttachmentParts);
    assert.strictEqual(uploadInserts[2].value.part, 1);
    assert.strictEqual(uploadInserts[3].table, projectAttachments);
    assert.strictEqual(uploadInserts[3].value.name, "empty.txt");
    assert.strictEqual(uploadInserts[3].value.size, 0);

    assert.ok(capturedMetadataQuery);
    assert.deepEqual(capturedMetadataQuery.params, ["proj-empty"]);

    const plan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${capturedMetadataQuery.sql}`)
      .all() as PlanRow[];
    assert.ok(
      plan.some((row) =>
        row.detail.includes(
          "SEARCH project_attachment USING COVERING INDEX project_attachment_order_idx (project_id=?)",
        ),
      ),
      `Expected covering index seek in query plan, got: ${JSON.stringify(plan)}`,
    );
    assert.ok(
      plan.every((row) => !row.detail.includes("TEMP B-TREE")),
      `Unexpected TEMP B-TREE sort in query plan: ${JSON.stringify(plan)}`,
    );
    assert.ok(
      plan.every((row) => !row.detail.includes("project_attachment_part")),
      `Unexpected chunk table access in query plan: ${JSON.stringify(plan)}`,
    );

    assert.deepEqual(
      saved.attachments.map(({ name, size }) => ({ name, size })),
      [
        { name: "bundle.bin", size: bigBytes.byteLength },
        { name: "empty.txt", size: 0 },
      ],
    );
  } finally {
    sqlite.close();
  }
});

test("downloadProjectAttachment uses PK left join and handles multi-part, empty, and missing files", async () => {
  const sqlite = createMigratedDb();
  const capturedPlans: PlanRow[][] = [];

  dbState.select.mockImplementation(async (statement) => {
    const query = statement.toSQL();
    capturedPlans.push(sqlite.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all() as PlanRow[]);
    return sqlite
      .prepare(query.sql)
      .all(...query.params)
      .map((row) => ({
        name: String(row.name),
        content: row.content === null ? null : String(row.content),
      }));
  });

  try {
    const multiResponse = await downloadProjectAttachment("proj-a", "att-b");
    assert.ok(multiResponse);
    assert.strictEqual(multiResponse.status, 200);
    assert.ok(
      multiResponse.headers.get("Content-Disposition")?.includes("spec.pdf"),
      "expected spec.pdf filename in Content-Disposition",
    );
    assert.strictEqual(await multiResponse.text(), "PART0_SPEC__PART1_SPEC__PART2_SPEC");

    const emptyResponse = await downloadProjectAttachment("proj-a", "att-zero");
    assert.ok(emptyResponse);
    assert.strictEqual(emptyResponse.status, 200);
    assert.ok(
      emptyResponse.headers.get("Content-Disposition")?.includes("empty.txt"),
      "expected empty.txt filename in Content-Disposition",
    );
    assert.strictEqual((await emptyResponse.arrayBuffer()).byteLength, 0);

    const missingResponse = await downloadProjectAttachment("proj-a", "does-not-exist");
    assert.strictEqual(missingResponse, null);

    assert.strictEqual(capturedPlans.length, 3);
    for (const plan of capturedPlans) {
      assert.ok(
        plan.some(
          (row) =>
            row.detail.includes("SEARCH") &&
            row.detail.includes("project_attachment") &&
            row.detail.includes("project_id=? AND attachment_id=?"),
        ),
        `Expected PK search on project_attachment, got: ${JSON.stringify(plan)}`,
      );
      assert.ok(
        plan.some(
          (row) =>
            row.detail.includes("SEARCH") &&
            row.detail.includes("project_attachment_part") &&
            row.detail.includes("LEFT-JOIN"),
        ),
        `Expected PK LEFT-JOIN search on project_attachment_part, got: ${JSON.stringify(plan)}`,
      );
    }
  } finally {
    sqlite.close();
  }
});
