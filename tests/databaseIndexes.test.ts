import type { SQLInputValue } from "node:sqlite";

import type { StoredProjectData } from "@db/schema";
import { listAccounts } from "@server/accounts";
import { listProjects } from "@server/projects";
import { assert, beforeEach, test, vi } from "vite-plus/test";

import { createMigratedDb } from "./fixtures/migratedDb";

type SqlQuery = { sql: string; params: SQLInputValue[] };
type SelectStatement = { toSQL: () => SqlQuery };
type PlanRow = { detail: string };
type IndexListRow = { name: string; unique: number };
type IndexInfoRow = { seqno: number; name: string };

const dbState = vi.hoisted(() => ({
  batch: vi.fn<(statements: unknown[]) => Promise<unknown[]>>(),
  select: vi.fn<(statement: SelectStatement) => Promise<unknown[]>>(),
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
      batch: (statements: unknown[]) => dbState.batch(statements),
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

function getIndexColumns(
  sqlite: ReturnType<typeof createMigratedDb>,
  tableName: string,
  indexName: string,
) {
  const indexes = sqlite.prepare(`PRAGMA index_list(${tableName})`).all() as Array<
    IndexListRow & { partial: number }
  >;
  const found = indexes.find((idx) => idx.name === indexName);
  assert.ok(found, `Expected index ${indexName} on table ${tableName}`);
  const columns = sqlite.prepare(`PRAGMA index_info(${indexName})`).all() as IndexInfoRow[];
  return {
    unique: found.unique === 1,
    partial: found.partial === 1,
    columns: columns.sort((a, b) => a.seqno - b.seqno).map((col) => col.name),
  };
}

beforeEach(() => {
  dbState.batch.mockReset();
  dbState.select.mockReset();
});

function toSqliteParams(params: SQLInputValue[]): SQLInputValue[] {
  return params.map((param) => (typeof param === "boolean" ? Number(param) : param));
}

test("migrations create expected FK and sort/filter indexes cleanly", () => {
  const sqlite = createMigratedDb();
  try {
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);

    assert.deepEqual(
      getIndexColumns(sqlite, "personal_workspace", "personal_workspace_user_id_idx"),
      { unique: false, partial: false, columns: ["user_id"] },
    );
    assert.deepEqual(
      getIndexColumns(sqlite, "course_project", "course_project_active_index_unique"),
      {
        unique: true,
        partial: true,
        columns: ["project_index"],
      },
    );
    const projectIndexes = sqlite
      .prepare("PRAGMA index_list(course_project)")
      .all() as IndexListRow[];
    assert.ok(!projectIndexes.some((idx) => idx.name === "course_project_project_index_unique"));
    assert.deepEqual(
      getIndexColumns(sqlite, "course_project", "course_project_deleted_index_idx"),
      {
        unique: false,
        partial: false,
        columns: ["deleted", "project_index", "id"],
      },
    );
    assert.deepEqual(
      getIndexColumns(sqlite, "project_attachment", "project_attachment_order_idx"),
      {
        unique: false,
        partial: false,
        columns: ["deleted", "project_id", "name", "attachment_id", "size"],
      },
    );
    assert.deepEqual(getIndexColumns(sqlite, "user", "user_deleted_createdAt_idx"), {
      unique: false,
      partial: false,
      columns: ["deleted", "createdAt"],
    });
    assert.deepEqual(getIndexColumns(sqlite, "user", "user_role_banned_deleted_idx"), {
      unique: false,
      partial: false,
      columns: ["deleted", "role", "banned"],
    });
  } finally {
    sqlite.close();
  }
});

test("design history migration keeps the original time and ordered parts when the workspace is replaced", () => {
  const sqlite = createMigratedDb((database, tag) => {
    if (!tag.startsWith("20261126111819_")) return;
    database.exec(`
      INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,deleted) VALUES ('s','Student','s@example.test',0,1,1,0);
      INSERT INTO course_project VALUES ('p',1,'{}','a',1,0);
      INSERT INTO personal_workspace VALUES ('old','p','s',42);
      INSERT INTO personal_workspace_part VALUES ('old',1,'稿📚"}'), ('old',0,'{"designDoc":"初');
    `);
  });
  try {
    sqlite.exec("DELETE FROM personal_workspace WHERE revision = 'old'");
    const row = sqlite
      .prepare(
        "SELECT user_id, project_id, version, edited_at, checkpoint FROM design_version WHERE id='old'",
      )
      .get();
    assert.deepEqual(
      { ...row },
      { user_id: "s", project_id: "p", version: 1, edited_at: 42, checkpoint: 1 },
    );
    const parts = sqlite
      .prepare("SELECT content FROM design_version_part WHERE id='old' ORDER BY part")
      .all();
    assert.equal(parts.map((row) => row.content).join(""), '{"designDoc":"初稿📚"}');
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    sqlite.close();
  }
});

test("partial active index allows atomic reorders while keeping soft-deleted records", () => {
  const sqlite = createMigratedDb();
  try {
    const insertProject = sqlite.prepare(
      "INSERT INTO course_project (id, project_index, data, created_by, created_at, deleted) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const data = {
      dueDate: "2026-12-31 23:59",
      points: 100,
      content: "# Assignment",
    };
    insertProject.run(
      "proj-1",
      1,
      JSON.stringify({ id: "proj-1", title: "One", ...data }),
      "a",
      1,
      0,
    );
    insertProject.run(
      "proj-del-old",
      0,
      JSON.stringify({ id: "proj-del-old", title: "Old Deleted", ...data }),
      "a",
      2,
      1,
    );
    insertProject.run(
      "proj-3",
      3,
      JSON.stringify({ id: "proj-3", title: "Three", ...data }),
      "a",
      3,
      0,
    );
    insertProject.run(
      "proj-del-2",
      0,
      JSON.stringify({ id: "proj-del-2", title: "Second Deleted", ...data }),
      "a",
      4,
      1,
    );
    assert.throws(() => {
      insertProject.run(
        "proj-dup-active",
        1,
        JSON.stringify({ id: "proj-dup-active", title: "Duplicate", ...data }),
        "a",
        5,
        0,
      );
    }, /UNIQUE constraint failed/);

    sqlite.exec("UPDATE course_project SET project_index = 0 WHERE deleted = 0;");
    sqlite.exec(
      "UPDATE course_project SET project_index = CASE WHEN id = 'proj-3' THEN 1 WHEN id = 'proj-1' THEN 2 ELSE 0 END WHERE deleted = 0;",
    );
    const reordered = sqlite
      .prepare(
        "SELECT id, project_index, deleted FROM course_project ORDER BY deleted, project_index, id",
      )
      .all()
      .map((row) => ({ ...row }));
    assert.deepEqual(reordered, [
      { id: "proj-3", project_index: 1, deleted: 0 },
      { id: "proj-1", project_index: 2, deleted: 0 },
      { id: "proj-del-2", project_index: 0, deleted: 1 },
      { id: "proj-del-old", project_index: 0, deleted: 1 },
    ]);
  } finally {
    sqlite.close();
  }
});

test("soft-deleting a user uses user_role_banned_deleted_idx and preserves account and workspace rows", () => {
  const sqlite = createMigratedDb();
  try {
    const guardedSoftDeleteSql =
      "UPDATE user SET deleted = 1, updatedAt = ? WHERE id = ? AND deleted = 0 AND EXISTS (SELECT 1 FROM user WHERE id = ? AND deleted = 0 AND role = 'admin' AND COALESCE(banned, 0) = 0) AND EXISTS (SELECT 1 FROM user WHERE id != ? AND deleted = 0 AND role = 'admin' AND COALESCE(banned, 0) = 0)";
    const guardedPlan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${guardedSoftDeleteSql}`)
      .all(5000, "student-1", "admin-1", "student-1") as PlanRow[];
    assert.ok(
      guardedPlan.some((row) =>
        row.detail.includes(
          "SEARCH user USING INDEX user_role_banned_deleted_idx (deleted=? AND role=?)",
        ),
      ),
      `Expected user_role_banned_deleted_idx search in guarded soft delete, got: ${JSON.stringify(guardedPlan)}`,
    );

    const insertUser = sqlite.prepare(
      "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, role, banned, deleted) VALUES (?, ?, ?, 0, ?, ?, ?, 0, 0)",
    );
    insertUser.run("admin-1", "Admin One", "admin1@example.com", 1000, 1000, "admin");
    insertUser.run("admin-2", "Admin Two", "admin2@example.com", 2000, 2000, "admin");
    insertUser.run("student-1", "Student One", "student1@example.com", 3000, 3000, "user");
    insertUser.run("student-2", "Student Two", "student2@example.com", 4000, 4000, "user");

    const insertSession = sqlite.prepare(
      "INSERT INTO session (id, expiresAt, token, createdAt, updatedAt, userId) VALUES (?, 999999, ?, 1000, 1000, ?)",
    );
    insertSession.run("sess-1", "tok-1", "student-1");
    insertSession.run("sess-2", "tok-2", "student-2");

    const insertAccount = sqlite.prepare(
      "INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt) VALUES (?, ?, 'credential', ?, 1000, 1000)",
    );
    insertAccount.run("acc-1", "student-1", "student-1");
    insertAccount.run("acc-2", "student-2", "student-2");

    const insertWorkspace = sqlite.prepare(
      "INSERT INTO personal_workspace (revision, project_id, user_id, updated_at) VALUES (?, ?, ?, ?)",
    );
    insertWorkspace.run("rev-s1", "proj-1", "student-1", 1000);
    insertWorkspace.run("rev-s2", "proj-1", "student-2", 2000);

    const insertPart = sqlite.prepare(
      "INSERT INTO personal_workspace_part (revision, part, content) VALUES (?, 0, ?)",
    );
    insertPart.run("rev-s1", '{"designDoc":"s1"}');
    insertPart.run("rev-s2", '{"designDoc":"s2"}');

    const sessionDelete = sqlite
      .prepare(
        "DELETE FROM session WHERE userId = ? AND EXISTS (SELECT id FROM user WHERE id = ? AND deleted = 0 AND EXISTS (SELECT 1 FROM user WHERE id = ? AND deleted = 0 AND role = 'admin' AND COALESCE(banned, 0) = 0) AND EXISTS (SELECT 1 FROM user WHERE id != ? AND deleted = 0 AND role = 'admin' AND COALESCE(banned, 0) = 0))",
      )
      .run("student-1", "student-1", "admin-1", "student-1");
    assert.strictEqual(sessionDelete.changes, 1);

    const result = sqlite
      .prepare(guardedSoftDeleteSql)
      .run(5000, "student-1", "admin-1", "student-1");
    assert.strictEqual(result.changes, 1);

    const softDeletedRow = sqlite
      .prepare("SELECT id, deleted FROM user WHERE id = 'student-1'")
      .get() as { id: string; deleted: number } | undefined;
    assert.deepEqual({ ...softDeletedRow }, { id: "student-1", deleted: 1 });

    assert.deepEqual(sqlite.prepare("SELECT * FROM session WHERE userId = 'student-1'").all(), []);
    assert.strictEqual(
      sqlite.prepare("SELECT * FROM account WHERE userId = 'student-1'").all().length,
      1,
    );
    assert.strictEqual(
      sqlite.prepare("SELECT * FROM personal_workspace WHERE user_id = 'student-1'").all().length,
      1,
    );
    assert.strictEqual(
      sqlite.prepare("SELECT * FROM personal_workspace_part WHERE revision = 'rev-s1'").all()
        .length,
      1,
    );
    assert.strictEqual(
      sqlite.prepare("SELECT * FROM session WHERE userId = 'student-2'").all().length,
      1,
    );
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    sqlite.close();
  }
});

test("listProjects and listAccounts use sort/deleted indexes without TEMP B-TREE", async () => {
  const sqlite = createMigratedDb();
  let capturedProjectsQuery: SqlQuery | undefined;
  let capturedAccountsQuery: SqlQuery | undefined;

  const insertProject = sqlite.prepare(
    "INSERT INTO course_project (id, project_index, data, created_by, created_at, deleted) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const baseProject = {
    dueDate: "2026-12-31 23:59",
    points: 100,
    content: "# Assignment",
  };
  insertProject.run(
    "proj-4",
    4,
    JSON.stringify({ id: "proj-4", title: "Alpha", ...baseProject }),
    "admin-1",
    5000,
    0,
  );
  insertProject.run(
    "proj-3",
    3,
    JSON.stringify({ id: "proj-3", title: "Zeta", ...baseProject }),
    "admin-1",
    1000,
    0,
  );
  insertProject.run(
    "proj-deleted",
    5,
    JSON.stringify({ id: "proj-deleted", title: "Hidden", ...baseProject }),
    "admin-1",
    6000,
    1,
  );

  const insertUser = sqlite.prepare(
    "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, role, banned, deleted) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)",
  );
  insertUser.run("u-1", "First User", "u1@example.com", 1000, 1000, "user", 0, 0);
  insertUser.run("u-2", "Latest Admin", "u2@example.com", 5000, 5000, "admin", 0, 0);
  insertUser.run("u-3", "Middle User", "u3@example.com", 3000, 3000, "user", 1, 0);
  insertUser.run("u-deleted", "Deleted User", "deleted@example.com", 9000, 9000, "user", 0, 1);

  dbState.batch.mockImplementationOnce(async (statements) => {
    assert.strictEqual(statements.length, 2);
    assert.ok(statements.every(isSelectStatement));

    const [projectsStmt, attachmentsStmt] = statements;
    const projectsSql = projectsStmt.toSQL();
    const attachmentsSql = attachmentsStmt.toSQL();
    capturedProjectsQuery = { ...projectsSql, params: toSqliteParams(projectsSql.params) };

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
      .all(...toSqliteParams(attachmentsSql.params));
    return [projectRows, attachmentRows];
  });

  dbState.select.mockImplementationOnce(async (statement) => {
    const query = statement.toSQL();
    const params = toSqliteParams(query.params);
    capturedAccountsQuery = { ...query, params };
    return sqlite
      .prepare(query.sql)
      .all(...params)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        role: row.role === null ? null : String(row.role),
        banned: row.banned === null ? null : Boolean(row.banned),
      }));
  });

  try {
    const catalog = await listProjects();
    assert.ok(capturedProjectsQuery);
    const projectsPlan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${capturedProjectsQuery.sql}`)
      .all(...capturedProjectsQuery.params) as PlanRow[];
    assert.ok(
      projectsPlan.some((row) =>
        row.detail.includes(
          "SEARCH course_project USING INDEX course_project_deleted_index_idx (deleted=?)",
        ),
      ),
      `Expected index search in listProjects query plan, got: ${JSON.stringify(projectsPlan)}`,
    );
    assert.ok(
      projectsPlan.every((row) => !row.detail.includes("TEMP B-TREE")),
      `Unexpected TEMP B-TREE in listProjects query plan: ${JSON.stringify(projectsPlan)}`,
    );
    assert.deepEqual(
      catalog.map((item) => ({ id: item.id, index: item.index })),
      [
        { id: "proj-3", index: 1 },
        { id: "proj-4", index: 2 },
      ],
    );

    const accounts = await listAccounts();
    assert.ok(capturedAccountsQuery);
    const accountsPlan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${capturedAccountsQuery.sql}`)
      .all(...capturedAccountsQuery.params) as PlanRow[];
    assert.ok(
      accountsPlan.some((row) =>
        row.detail.includes("SEARCH user USING INDEX user_deleted_createdAt_idx (deleted=?)"),
      ),
      `Expected index search in listAccounts query plan, got: ${JSON.stringify(accountsPlan)}`,
    );
    assert.ok(
      accountsPlan.every((row) => !row.detail.includes("TEMP B-TREE")),
      `Unexpected TEMP B-TREE in listAccounts query plan: ${JSON.stringify(accountsPlan)}`,
    );
    assert.deepEqual(
      accounts.map((account) => account.id),
      ["u-2", "u-3", "u-1"],
    );
  } finally {
    sqlite.close();
  }
});
