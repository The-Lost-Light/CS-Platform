import { Buffer } from "node:buffer";
import type { SQLInputValue } from "node:sqlite";

import { projectAttachmentParts, projectAttachments, type StoredProjectData } from "@db/schema";
import { downloadProjectAttachment, listProjects, saveProject } from "@server/projects";
import { assert, beforeEach, test, vi } from "vite-plus/test";

import { createMigratedDb } from "./fixtures/migratedDb";

type SqlQuery = { sql: string; params: SQLInputValue[] };
type SelectStatement = { toSQL: () => SqlQuery };
type InsertValuesStatement = {
  kind: "insert-values";
  table: unknown;
  value: Record<string, unknown>;
};
type UpdateStatement = { kind: "update"; table: unknown; value: Record<string, unknown> };
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
          returning: () => ({ kind: "write" as const, table }),
          onConflictDoUpdate: () => ({
            returning: () => ({ kind: "write" as const, table }),
          }),
        }),
      }),
      update: (table: unknown) => ({
        set: (value: Record<string, unknown>) => ({
          where: () => ({
            kind: "update" as const,
            table,
            value,
            returning: () => ({ kind: "write" as const, table, value }),
          }),
        }),
      }),
      batch: (statements: unknown[]) => dbState.batch(statements),
      get: (query: unknown) => dbState.get(query),
    },
  };
});

function toSqliteParams(params: SQLInputValue[]): SQLInputValue[] {
  return params.map((param) => (typeof param === "boolean" ? Number(param) : param));
}

function isSelectStatement(statement: unknown): statement is SelectStatement {
  return (
    typeof statement === "object" &&
    statement !== null &&
    "toSQL" in statement &&
    typeof statement.toSQL === "function"
  );
}

function seedProjects(sqlite: ReturnType<typeof createMigratedDb>) {
  const insertProject = sqlite.prepare(
    "INSERT INTO course_project (id, project_index, data, created_by, created_at, deleted) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const baseProject = {
    dueDate: "2026-12-31 23:59",
    points: 100,
    content: "# Assignment",
  };
  insertProject.run(
    "proj-a",
    3,
    JSON.stringify({ id: "proj-a", title: "Project A", ...baseProject }),
    "admin-1",
    2000,
    0,
  );
  insertProject.run(
    "proj-b",
    4,
    JSON.stringify({ id: "proj-b", title: "Project B", ...baseProject }),
    "admin-1",
    1000,
    0,
  );
  insertProject.run(
    "proj-empty",
    5,
    JSON.stringify({
      id: "proj-empty",
      title: "Project Empty",
      ...baseProject,
    }),
    "admin-1",
    500,
    0,
  );
  insertProject.run(
    "proj-deleted",
    6,
    JSON.stringify({
      id: "proj-deleted",
      title: "Project Deleted",
      ...baseProject,
    }),
    "admin-1",
    400,
    1,
  );
}

function createSeededDb() {
  const sqlite = createMigratedDb();
  seedProjects(sqlite);

  const insertAttachment = sqlite.prepare(
    "INSERT INTO project_attachment (project_id, attachment_id, name, size, deleted) VALUES (?, ?, ?, ?, ?)",
  );
  const insertPart = sqlite.prepare(
    "INSERT INTO project_attachment_part (project_id, attachment_id, part, content) VALUES (?, ?, ?, ?)",
  );

  insertAttachment.run("proj-a", "att-b", "spec.pdf", 1024, 0);
  insertPart.run("proj-a", "att-b", 0, Buffer.from("PART0_SPEC__").toString("base64"));
  insertPart.run("proj-a", "att-b", 1, Buffer.from("PART1_SPEC__").toString("base64"));
  insertPart.run("proj-a", "att-b", 2, Buffer.from("PART2_SPEC").toString("base64"));

  insertAttachment.run("proj-a", "att-a2", "guide.md", 512, 0);
  insertPart.run("proj-a", "att-a2", 0, Buffer.from("PART0_GUIDE2").toString("base64"));

  insertAttachment.run("proj-a", "att-a1", "guide.md", 256, 0);
  insertPart.run("proj-a", "att-a1", 0, Buffer.from("PART0_GUIDE1").toString("base64"));

  insertAttachment.run("proj-a", "att-zero", "empty.txt", 0, 0);

  insertAttachment.run("proj-a", "att-deleted", "deleted.txt", 64, 1);
  insertPart.run("proj-a", "att-deleted", 0, Buffer.from("DELETED").toString("base64"));

  insertAttachment.run("proj-b", "att-c", "rubric.txt", 128, 0);
  insertPart.run("proj-b", "att-c", 0, Buffer.from("PART0_RUBRIC").toString("base64"));
  insertPart.run("proj-b", "att-c", 1, Buffer.from("PART1_RUBRIC").toString("base64"));

  insertAttachment.run("proj-deleted", "att-hidden", "hidden.txt", 32, 0);
  insertPart.run("proj-deleted", "att-hidden", 0, Buffer.from("HIDDEN").toString("base64"));

  return sqlite;
}

beforeEach(() => {
  dbState.batch.mockReset();
  dbState.select.mockReset();
  dbState.get.mockReset();
  dbState.get.mockResolvedValue({ 1: 1 });
});

test("project attachment tables enforce cascade deletes for attachment and project removal", () => {
  const sqlite = createSeededDb();
  try {
    const partColumns = (
      sqlite.prepare("PRAGMA table_info(project_attachment_part)").all() as Array<{ name: string }>
    ).map((column) => column.name);
    assert.deepEqual(partColumns, ["project_id", "attachment_id", "part", "content"]);

    sqlite
      .prepare("DELETE FROM project_attachment WHERE project_id = ? AND attachment_id = ?")
      .run("proj-a", "att-b");
    assert.deepEqual(
      sqlite
        .prepare(
          "SELECT attachment_id, part FROM project_attachment_part WHERE project_id = 'proj-a' AND attachment_id = 'att-b'",
        )
        .all(),
      [],
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
  const sqlite = createSeededDb();
  let capturedAttachmentQuery: SqlQuery | undefined;

  dbState.batch.mockImplementationOnce(async (statements) => {
    assert.strictEqual(statements.length, 2);
    assert.ok(statements.every(isSelectStatement));

    const [projectsStmt, attachmentsStmt] = statements;
    const projectsSql = projectsStmt.toSQL();
    const attachmentsSql = attachmentsStmt.toSQL();
    capturedAttachmentQuery = {
      ...attachmentsSql,
      params: toSqliteParams(attachmentsSql.params),
    };

    const projectRows = sqlite
      .prepare(projectsSql.sql)
      .all(...toSqliteParams(projectsSql.params))
      .map((row) => ({
        id: String(row.id),
        index: Number(row.project_index),
        data: JSON.parse(String(row.data)) as StoredProjectData,
      }));

    const attachmentRows = sqlite
      .prepare(attachmentsSql.sql)
      .all(...toSqliteParams(attachmentsSql.params))
      .map((row) => ({
        projectId: String(row.project_id),
        id: String(row.attachment_id),
        name: String(row.name),
        size: Number(row.size),
      }));

    return [projectRows, attachmentRows];
  });

  try {
    const catalog = await listProjects();

    assert.ok(capturedAttachmentQuery);
    assert.deepEqual(capturedAttachmentQuery.params, [0]);

    const plan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${capturedAttachmentQuery.sql}`)
      .all(...capturedAttachmentQuery.params) as PlanRow[];
    assert.ok(
      plan.some((row) =>
        row.detail.includes(
          "SEARCH project_attachment USING COVERING INDEX project_attachment_order_idx (deleted=?)",
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
    const projectDeleted = catalog.find((item) => item.id === "proj-deleted");

    assert.strictEqual(projectDeleted, undefined);
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

test("saveProject soft-deletes omitted attachments, writes chunks separately, and reads back via covering index seek", async () => {
  const sqlite = createSeededDb();
  let capturedStatements: unknown[] = [];
  let capturedMetadataQuery: SqlQuery | undefined;

  dbState.batch.mockImplementationOnce(async (statements) => {
    capturedStatements = statements;
    const insertAttachment = sqlite.prepare(
      "INSERT INTO project_attachment (project_id, attachment_id, name, size, deleted) VALUES (?, ?, ?, ?, 0)",
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
    capturedMetadataQuery = { ...metadataSql, params: toSqliteParams(metadataSql.params) };

    const attachmentRows = sqlite
      .prepare(metadataSql.sql)
      .all(...capturedMetadataQuery.params)
      .map((row) => ({
        id: String(row.attachment_id),
        name: String(row.name),
        size: Number(row.size),
      }));

    return [
      [{ id: "proj-empty", index: 5 }],
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
          title: "Project Empty",
          dueDate: "2026-12-31 23:59",
          points: 100,
          content: "# Updated",
        },
        retained: [],
        uploads: [bigFile, emptyFile],
      },
      "admin-1",
      "proj-empty",
    );

    assert.ok(saved);
    assert.strictEqual(saved.index, 5);
    assert.strictEqual((capturedStatements[1] as UpdateStatement).kind, "update");
    assert.strictEqual((capturedStatements[1] as UpdateStatement).table, projectAttachments);
    assert.deepEqual((capturedStatements[1] as UpdateStatement).value, { deleted: true });

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
    assert.deepEqual(capturedMetadataQuery.params, [0, "proj-empty"]);

    const plan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${capturedMetadataQuery.sql}`)
      .all(...capturedMetadataQuery.params) as PlanRow[];
    assert.ok(
      plan.some((row) =>
        row.detail.includes(
          "SEARCH project_attachment USING COVERING INDEX project_attachment_order_idx (deleted=? AND project_id=?)",
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

test("downloadProjectAttachment uses PK left join and hides soft-deleted attachments and projects", async () => {
  const sqlite = createSeededDb();
  const capturedPlans: PlanRow[][] = [];

  dbState.select.mockImplementation(async (statement) => {
    const query = statement.toSQL();
    const params = toSqliteParams(query.params);
    capturedPlans.push(
      sqlite.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all(...params) as PlanRow[],
    );
    return sqlite
      .prepare(query.sql)
      .all(...params)
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

    assert.strictEqual(await downloadProjectAttachment("proj-a", "att-deleted"), null);
    assert.strictEqual(await downloadProjectAttachment("proj-deleted", "att-hidden"), null);
    assert.strictEqual(await downloadProjectAttachment("proj-a", "does-not-exist"), null);

    assert.strictEqual(capturedPlans.length, 5);
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
