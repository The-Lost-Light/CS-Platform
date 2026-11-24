import { changeAccountPassword } from "@server/accounts";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/passwordPolicy";
import { assert, beforeEach, test, vi } from "vite-plus/test";

interface TargetRow {
  role: string | null;
  credentialId: string | null;
  hash: string | null;
}

const dbState = vi.hoisted(() => ({
  targetRow: null as TargetRow | null,
  batchResult: [undefined, [{ id: "cred-1" }]] as [unknown, Array<{ id: string }>],
  batchCalled: false,
  deleteWhere: undefined as unknown,
  updateWhere: undefined as unknown,
  updateSet: undefined as unknown,
}));

vi.mock("void/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("void/db")>();
  return {
    ...actual,
    db: {
      select() {
        return {
          from() {
            return {
              leftJoin() {
                return {
                  where() {
                    return {
                      limit() {
                        return Promise.resolve(dbState.targetRow ? [dbState.targetRow] : []);
                      },
                    };
                  },
                };
              },
              where() {
                return {
                  getSQL: () => actual.sql`SELECT 1`,
                };
              },
            };
          },
        };
      },
      delete() {
        return {
          where(predicate: unknown) {
            dbState.deleteWhere = predicate;
            return { kind: "delete" };
          },
        };
      },
      update() {
        return {
          set(values: unknown) {
            dbState.updateSet = values;
            return {
              where(predicate: unknown) {
                dbState.updateWhere = predicate;
                return {
                  returning() {
                    return { kind: "update" };
                  },
                };
              },
            };
          },
        };
      },
      batch() {
        dbState.batchCalled = true;
        return Promise.resolve(dbState.batchResult);
      },
    },
  };
});

function flattenSqlText(node: unknown): string {
  if (typeof node !== "object" || node === null) return "";
  if ("value" in node && Array.isArray(node.value)) {
    return node.value.filter((part): part is string => typeof part === "string").join("");
  }
  if ("queryChunks" in node && Array.isArray(node.queryChunks)) {
    return node.queryChunks.map((chunk) => flattenSqlText(chunk)).join("");
  }
  return "";
}

function createHasher(verifyResult = true) {
  return {
    hash: vi.fn(async (password: string) => `hashed:${password}`),
    verify: vi.fn(async () => verifyResult),
  };
}

beforeEach(() => {
  dbState.targetRow = { role: "user", credentialId: "cred-1", hash: "stored-hash" };
  dbState.batchResult = [undefined, [{ id: "cred-1" }]];
  dbState.batchCalled = false;
  dbState.deleteWhere = undefined;
  dbState.updateWhere = undefined;
  dbState.updateSet = undefined;
});

test("admin resetting a student password skips currentPassword and guards role in batch update", async () => {
  for (const role of ["user", null]) {
    dbState.targetRow = { role, credentialId: "cred-student", hash: "old-hash" };
    dbState.batchResult = [undefined, [{ id: "cred-student" }]];
    dbState.batchCalled = false;
    dbState.updateWhere = undefined;

    const hasher = createHasher();
    const result = await changeAccountPassword(
      { scope: "admin", id: "student-1", actorId: "admin-1" },
      { newPassword: "new-password-1" },
      hasher,
    );

    assert.strictEqual(result, "updated");
    assert.strictEqual(hasher.verify.mock.calls.length, 0);
    assert.strictEqual(hasher.hash.mock.calls.length, 1);
    assert.strictEqual(dbState.batchCalled, true);
    assert.ok(flattenSqlText(dbState.updateWhere).includes("COALESCE(role, 'user') != 'admin'"));
  }
});

test("admin resetting a student password rejects supplied currentPassword and handles conflicts", async () => {
  const hasher = createHasher();
  assert.strictEqual(
    await changeAccountPassword(
      { scope: "admin", id: "student-1", actorId: "admin-1" },
      { currentPassword: "anything", newPassword: "new-password-1" },
      hasher,
    ),
    "invalid",
  );
  assert.strictEqual(dbState.batchCalled, false);

  dbState.targetRow = { role: "user", credentialId: null, hash: null };
  assert.strictEqual(
    await changeAccountPassword(
      { scope: "admin", id: "student-1", actorId: "admin-1" },
      { newPassword: "new-password-1" },
      hasher,
    ),
    "conflict",
  );
  assert.strictEqual(dbState.batchCalled, false);

  dbState.targetRow = { role: "user", credentialId: "cred-1", hash: "stored-hash" };
  dbState.batchResult = [undefined, []];
  assert.strictEqual(
    await changeAccountPassword(
      { scope: "admin", id: "student-1", actorId: "admin-1" },
      { newPassword: "new-password-1" },
      hasher,
    ),
    "conflict",
  );
});

test("admin changing another admin password requires and verifies currentPassword", async () => {
  dbState.targetRow = { role: "admin", credentialId: "cred-admin-2", hash: "admin-2-hash" };

  for (const invalidBody of [
    { newPassword: "new-password-1" },
    { currentPassword: "", newPassword: "new-password-1" },
  ]) {
    const hasher = createHasher();
    assert.strictEqual(
      await changeAccountPassword(
        { scope: "admin", id: "admin-2", actorId: "admin-1" },
        invalidBody,
        hasher,
      ),
      "invalidCurrentPassword",
    );
    assert.strictEqual(hasher.verify.mock.calls.length, 0);
  }

  const wrongHasher = createHasher(false);
  assert.strictEqual(
    await changeAccountPassword(
      { scope: "admin", id: "admin-2", actorId: "admin-1" },
      { currentPassword: "wrong-password", newPassword: "new-password-1" },
      wrongHasher,
    ),
    "invalidCurrentPassword",
  );
  assert.strictEqual(wrongHasher.verify.mock.calls.length, 1);

  const validHasher = createHasher(true);
  assert.strictEqual(
    await changeAccountPassword(
      { scope: "admin", id: "admin-2", actorId: "admin-1" },
      { currentPassword: "right-password", newPassword: "new-password-1" },
      validHasher,
    ),
    "updated",
  );
  assert.strictEqual(validHasher.verify.mock.calls.length, 1);
  assert.ok(!flattenSqlText(dbState.updateWhere).includes("COALESCE(role, 'user') != 'admin'"));
});

test("self password changes require currentPassword for both admin and student targets", async () => {
  for (const target of [
    { scope: "admin" as const, id: "admin-1", actorId: "admin-1", role: "admin" },
    { scope: "self" as const, id: "student-1", role: "user" },
  ]) {
    const { role, ...accountTarget } = target;
    dbState.targetRow = { role, credentialId: "cred-self", hash: "self-hash" };

    for (const invalidBody of [
      { newPassword: "new-password-1" },
      { currentPassword: "", newPassword: "new-password-1" },
    ]) {
      const hasher = createHasher();
      assert.strictEqual(
        await changeAccountPassword(accountTarget, invalidBody, hasher),
        "invalidCurrentPassword",
      );
      assert.strictEqual(hasher.verify.mock.calls.length, 0);
    }

    const wrongHasher = createHasher(false);
    assert.strictEqual(
      await changeAccountPassword(
        accountTarget,
        { currentPassword: "wrong-password", newPassword: "new-password-1" },
        wrongHasher,
      ),
      "invalidCurrentPassword",
    );

    const validHasher = createHasher(true);
    assert.strictEqual(
      await changeAccountPassword(
        accountTarget,
        { currentPassword: "right-password", newPassword: "new-password-1" },
        validHasher,
      ),
      "updated",
    );
    assert.ok(!flattenSqlText(dbState.updateWhere).includes("COALESCE(role, 'user') != 'admin'"));
  }
});

test("missing target user and invalid password lengths are rejected", async () => {
  const hasher = createHasher();
  for (const newPassword of [
    "x".repeat(MIN_PASSWORD_LENGTH - 1),
    "x".repeat(MAX_PASSWORD_LENGTH + 1),
  ]) {
    assert.strictEqual(
      await changeAccountPassword(
        { scope: "admin", id: "student-1", actorId: "admin-1" },
        { newPassword },
        hasher,
      ),
      "invalid",
    );
  }

  dbState.targetRow = null;
  assert.strictEqual(
    await changeAccountPassword(
      { scope: "admin", id: "missing", actorId: "admin-1" },
      { newPassword: "new-password-1" },
      hasher,
    ),
    "notFound",
  );
});
