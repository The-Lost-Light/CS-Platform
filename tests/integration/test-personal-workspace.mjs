import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";

import { hashPassword } from "better-auth/crypto";

// Run against a local Void dev server with its local D1 migrations applied.
const base = "http://127.0.0.1:" + (Number(process.env.WORKSPACE_TEST_PORT) || 5173);
const accounts = Array.from({ length: 2 }, () => {
  const id = randomUUID();
  return { id, email: id + "@example.test", password: randomUUID() };
});
const sqlFile = ".void/test-workspace-" + randomUUID() + ".sql";
function executeLocal(sql) {
  writeFileSync(sqlFile, sql, { mode: 0o600 });
  try {
    execFileSync(
      process.execPath,
      ["node_modules/void/dist/cli/cli.mjs", "db", "execute", "--file", sqlFile],
      { stdio: "ignore" },
    );
  } finally {
    unlinkSync(sqlFile);
  }
}
function request(path, cookie, method = "GET", body, accountId) {
  const headers = { Origin: base, Cookie: cookie, "Content-Type": "application/json" };
  if (accountId) headers["X-Workspace-Account"] = accountId;
  return fetch(base + path, { method, headers, body: JSON.stringify(body) });
}
async function login({ email, password }) {
  const response = await request("/api/auth/sign-in/email", "", "POST", { email, password });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}
async function read(path, cookie) {
  const response = await request(path, cookie);
  assert.equal(response.status, 200);
  return response.json();
}
const timestamp = Date.now();
const setup = [];
for (const { id, email, password } of accounts) {
  const hash = await hashPassword(password);
  setup.push(
    `INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,role,banned) VALUES ('${id}','Workspace test','${email}',0,${timestamp},${timestamp},'user',0);`,
    `INSERT INTO account (id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES ('${randomUUID()}','${id}','credential','${id}','${hash}',${timestamp},${timestamp});`,
  );
}
try {
  executeLocal(setup.join("\n"));
  const [first, second] = accounts;
  const firstCookie = await login(first);
  const secondCookie = await login(second);
  assert.equal((await read("/api/session", firstCookie)).user.id, first.id);
  const { projects } = await read("/api/projects", firstCookie);
  const openProjects = projects.filter(
    (p) => !p.dueDate || Date.parse(p.dueDate.replace(" ", "T") + ":00+08:00") > Date.now(),
  );
  assert.ok(openProjects.length >= 2, "Two open local course projects are required");
  const [path, otherProject] = openProjects.map(
    (p) => "/api/projects/" + encodeURIComponent(p.id) + "/workspace",
  );
  assert.deepEqual(await read(path, firstCookie), {
    accountId: first.id,
    revision: null,
    updatedAt: null,
    draft: null,
  });
  const hugeNodes = Array.from({ length: 250 }, (_, index) => ({
    id: `node-${index}`,
    kind: "system",
    label: `API ${index}`,
    category: "",
    parentId: null,
    description: "架構📚".repeat(500),
    technology: "",
    x: index * 100,
    y: 50,
  }));
  const draft = {
    designDoc: "# 我的 README\n測試",
    model: {
      format: "cap-c4",
      version: 1,
      nodes: hugeNodes,
      relationships: [
        { id: "ab", source: "node-0", target: "node-1", label: "writes", technology: "SQL" },
      ],
    },
    repoUrl: "https://github.com/example/first",
  };
  const save = (cookie, account, revision, value) =>
    request(path, cookie, "PUT", { revision, draft: value }, account.id);
  assert.equal((await save(firstCookie, first, randomUUID(), draft)).status, 409);
  const response = await save(firstCookie, first, null, draft);
  assert.equal(response.status, 200, (await response.clone().text()).slice(0, 500));
  const { revision, updatedAt } = await response.json();
  assert.equal(typeof updatedAt, "number");
  assert.ok(updatedAt > 0);
  assert.equal(
    (await save(firstCookie, first, revision, { ...draft, designDoc: "x".repeat(100_001) })).status,
    400,
  );
  const oversizedNodes = Array.from({ length: 501 }, (_, index) => ({
    id: `over-${index}`,
    kind: "system",
    label: "Node",
    category: "",
    parentId: null,
    description: "",
    technology: "",
    x: 0,
    y: 0,
  }));
  assert.equal(
    (
      await save(firstCookie, first, revision, {
        designDoc: "",
        model: { format: "cap-c4", version: 1, nodes: oversizedNodes, relationships: [] },
        repoUrl: "",
      })
    ).status,
    400,
  );
  assert.deepEqual((await read(path, firstCookie)).draft, draft);
  assert.equal((await read(path, secondCookie)).draft, null);
  assert.equal((await read(otherProject, firstCookie)).draft, null);
  const empty = {
    designDoc: "",
    model: { format: "cap-c4", version: 1, nodes: [], relationships: [] },
    repoUrl: "",
  };
  assert.equal((await save(secondCookie, second, null, empty)).status, 200);
  assert.deepEqual((await read(path, secondCookie)).draft, empty);
  assert.equal((await request("/api/auth/sign-out", firstCookie, "POST", {})).status, 200);
  const restored = await login(first);
  assert.deepEqual((await read(path, restored)).draft, draft);
  const concurrentDrafts = ["First tab", "Second tab"].map((designDoc) => ({
    ...empty,
    designDoc,
  }));
  const writes = await Promise.all(
    concurrentDrafts.map((value) => save(restored, first, revision, value)),
  );
  assert.deepEqual(
    writes.map((r) => r.status).sort((a, b) => a - b),
    [200, 409],
  );
  assert.deepEqual(
    (await read(path, restored)).draft,
    concurrentDrafts[writes.findIndex((r) => r.ok)],
  );
  assert.deepEqual((await read(path, secondCookie)).draft, empty);
  console.log(
    "Passed account and project isolation, multi-part Unicode C4 model, empty drafts, login restore, and simultaneous saves.",
  );
} finally {
  executeLocal(`DELETE FROM user WHERE id IN ('${accounts[0].id}', '${accounts[1].id}');`);
}
