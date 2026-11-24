import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import type { Project } from "@modules/projects";
import { listAccounts } from "@server/accounts";
import { listProjects } from "@server/projects";
import { assert, beforeEach, test, vi } from "vite-plus/test";

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

function createMigratedDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const journalPath = path.resolve("db/migrations/meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };
  for (const { tag } of journal.entries) {
    const sqlText = readFileSync(path.resolve("db/migrations", `${tag}.sql`), "utf8");
    for (const statement of sqlText.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }
  return sqlite;
}

function getIndexColumns(sqlite: DatabaseSync, tableName: string, indexName: string) {
  const indexes = sqlite.prepare(`PRAGMA index_list(${tableName})`).all() as IndexListRow[];
  const found = indexes.find((idx) => idx.name === indexName);
  assert.ok(found, `Expected index ${indexName} on table ${tableName}`);
  const columns = sqlite.prepare(`PRAGMA index_info(${indexName})`).all() as IndexInfoRow[];
  return {
    unique: found.unique === 1,
    columns: columns.sort((a, b) => a.seqno - b.seqno).map((col) => col.name),
  };
}

beforeEach(() => {
  dbState.batch.mockReset();
  dbState.select.mockReset();
});

test("migrations create expected FK and sort/filter indexes cleanly", () => {
  const sqlite = createMigratedDb();
  try {
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);

    assert.deepEqual(
      getIndexColumns(sqlite, "personal_workspace", "personal_workspace_user_id_idx"),
      { unique: false, columns: ["user_id"] },
    );
    assert.deepEqual(getIndexColumns(sqlite, "course_project", "course_project_created_at_idx"), {
      unique: false,
      columns: ["created_at"],
    });
    assert.deepEqual(getIndexColumns(sqlite, "user", "user_createdAt_idx"), {
      unique: false,
      columns: ["createdAt"],
    });
    assert.deepEqual(getIndexColumns(sqlite, "user", "user_role_banned_idx"), {
      unique: false,
      columns: ["role", "banned"],
    });
  } finally {
    sqlite.close();
  }
});

test("deleting a user uses personal_workspace_user_id_idx and cascades cleanly", () => {
  const sqlite = createMigratedDb();
  try {
    const directPlan = sqlite
      .prepare("EXPLAIN QUERY PLAN DELETE FROM user WHERE id = ?")
      .all("student-1") as PlanRow[];
    assert.ok(
      directPlan.some((row) =>
        row.detail.includes(
          "SEARCH personal_workspace USING COVERING INDEX personal_workspace_user_id_idx (user_id=?)",
        ),
      ),
      `Expected covering index lookup on personal_workspace, got: ${JSON.stringify(directPlan)}`,
    );
    assert.ok(
      directPlan.every((row) => !row.detail.includes("SCAN personal_workspace")),
      `Unexpected full table scan on personal_workspace: ${JSON.stringify(directPlan)}`,
    );

    const guardedDeleteSql =
      "DELETE FROM user WHERE id = ? AND EXISTS (SELECT 1 FROM user WHERE id = ? AND role = 'admin' AND COALESCE(banned, 0) = 0) AND EXISTS (SELECT 1 FROM user WHERE id != ? AND role = 'admin' AND COALESCE(banned, 0) = 0)";
    const guardedPlan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${guardedDeleteSql}`)
      .all("student-1", "admin-1", "student-1") as PlanRow[];
    assert.ok(
      guardedPlan.some((row) =>
        row.detail.includes(
          "SEARCH personal_workspace USING COVERING INDEX personal_workspace_user_id_idx (user_id=?)",
        ),
      ),
      `Expected covering index lookup on personal_workspace in guarded delete, got: ${JSON.stringify(guardedPlan)}`,
    );
    assert.ok(
      guardedPlan.some((row) =>
        row.detail.includes("SEARCH user USING INDEX user_role_banned_idx (role=?)"),
      ),
      `Expected user_role_banned_idx search in guarded delete, got: ${JSON.stringify(guardedPlan)}`,
    );

    const insertUser = sqlite.prepare(
      "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, role, banned) VALUES (?, ?, ?, 0, ?, ?, ?, 0)",
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
      "INSERT INTO personal_workspace (revision, project_id, user_id) VALUES (?, ?, ?)",
    );
    insertWorkspace.run("rev-s1", "proj-1", "student-1");
    insertWorkspace.run("rev-s2", "proj-1", "student-2");

    const insertPart = sqlite.prepare(
      "INSERT INTO personal_workspace_part (revision, part, content) VALUES (?, 0, ?)",
    );
    insertPart.run("rev-s1", '{"designDoc":"s1"}');
    insertPart.run("rev-s2", '{"designDoc":"s2"}');

    const result = sqlite.prepare(guardedDeleteSql).run("student-1", "admin-1", "student-1");
    assert.strictEqual(result.changes, 1);

    assert.deepEqual(
      sqlite.prepare("SELECT * FROM personal_workspace WHERE user_id = 'student-1'").all(),
      [],
    );
    assert.deepEqual(
      sqlite.prepare("SELECT * FROM personal_workspace_part WHERE revision = 'rev-s1'").all(),
      [],
    );
    assert.deepEqual(sqlite.prepare("SELECT * FROM session WHERE userId = 'student-1'").all(), []);
    assert.deepEqual(sqlite.prepare("SELECT * FROM account WHERE userId = 'student-1'").all(), []);

    assert.strictEqual(
      sqlite.prepare("SELECT * FROM personal_workspace WHERE user_id = 'student-2'").all().length,
      1,
    );
    assert.strictEqual(
      sqlite.prepare("SELECT * FROM personal_workspace_part WHERE revision = 'rev-s2'").all()
        .length,
      1,
    );
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    sqlite.close();
  }
});

test("listProjects and listAccounts use sort indexes without TEMP B-TREE", async () => {
  const sqlite = createMigratedDb();
  let capturedProjectsQuery: SqlQuery | undefined;
  let capturedAccountsQuery: SqlQuery | undefined;

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
    "proj-old",
    "CUSTOM-OLD",
    JSON.stringify({ id: "proj-old", codeName: "CUSTOM-OLD", title: "Old", ...baseProject }),
    "admin-1",
    1000,
  );
  insertProject.run(
    "proj-new",
    "CUSTOM-NEW",
    JSON.stringify({ id: "proj-new", codeName: "CUSTOM-NEW", title: "New", ...baseProject }),
    "admin-1",
    3000,
  );

  const insertUser = sqlite.prepare(
    "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, role, banned) VALUES (?, ?, ?, 0, ?, ?, ?, ?)",
  );
  insertUser.run("u-1", "First User", "u1@example.com", 1000, 1000, "user", 0);
  insertUser.run("u-2", "Latest Admin", "u2@example.com", 5000, 5000, "admin", 0);
  insertUser.run("u-3", "Middle User", "u3@example.com", 3000, 3000, "user", 1);

  dbState.batch.mockImplementationOnce(async (statements) => {
    assert.strictEqual(statements.length, 3);
    assert.ok(statements.every(isSelectStatement));

    const [projectsStmt, attachmentsStmt, removedStmt] = statements;
    const projectsSql = projectsStmt.toSQL();
    const attachmentsSql = attachmentsStmt.toSQL();
    const removedSql = removedStmt.toSQL();
    capturedProjectsQuery = projectsSql;

    const projectRows = sqlite
      .prepare(projectsSql.sql)
      .all(...projectsSql.params)
      .map((row) => ({
        data: JSON.parse(String(row.data)) as Omit<Project, "attachments">,
      }));
    const attachmentRows = sqlite.prepare(attachmentsSql.sql).all(...attachmentsSql.params);
    const removedRows = sqlite.prepare(removedSql.sql).all(...removedSql.params);
    return [projectRows, attachmentRows, removedRows];
  });

  dbState.select.mockImplementationOnce(async (statement) => {
    const query = statement.toSQL();
    capturedAccountsQuery = query;
    return sqlite
      .prepare(query.sql)
      .all(...query.params)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        role: row.role === null ? null : String(row.role),
        banned: row.banned === null ? null : Boolean(row.banned),
      }));
  });

  try {
    const catalog = await listProjects("en");
    assert.ok(capturedProjectsQuery);
    const projectsPlan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${capturedProjectsQuery.sql}`)
      .all(...capturedProjectsQuery.params) as PlanRow[];
    assert.ok(
      projectsPlan.some((row) =>
        row.detail.includes("SCAN course_project USING INDEX course_project_created_at_idx"),
      ),
      `Expected index scan in listProjects query plan, got: ${JSON.stringify(projectsPlan)}`,
    );
    assert.ok(
      projectsPlan.every((row) => !row.detail.includes("TEMP B-TREE")),
      `Unexpected TEMP B-TREE in listProjects query plan: ${JSON.stringify(projectsPlan)}`,
    );
    const customIds = catalog
      .filter((item) => item.id === "proj-old" || item.id === "proj-new")
      .map((item) => item.id);
    assert.deepEqual(customIds, ["proj-new", "proj-old"]);

    const accounts = await listAccounts();
    assert.ok(capturedAccountsQuery);
    const accountsPlan = sqlite
      .prepare(`EXPLAIN QUERY PLAN ${capturedAccountsQuery.sql}`)
      .all(...capturedAccountsQuery.params) as PlanRow[];
    assert.ok(
      accountsPlan.some((row) => row.detail.includes("SCAN user USING INDEX user_createdAt_idx")),
      `Expected index scan in listAccounts query plan, got: ${JSON.stringify(accountsPlan)}`,
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
