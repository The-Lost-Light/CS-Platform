import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";

import { hashPassword } from "better-auth/crypto";

// Run against a local Void dev server with its local D1 migrations applied.
const base = "http://127.0.0.1:" + (Number(process.env.WORKSPACE_TEST_PORT) || 5173);
const accounts = Array.from({ length: 3 }, (_, index) => {
  const id = randomUUID();
  return {
    id,
    email: id + "@example.test",
    password: randomUUID().slice(0, 16),
    role: index === 2 ? "admin" : "user",
  };
});
const testProjectIds = [randomUUID(), randomUUID()];
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
for (const { id, email, password, role } of accounts) {
  const hash = await hashPassword(password);
  setup.push(
    `INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,role,banned,deleted) VALUES ('${id}','Workspace test','${email}',0,${timestamp},${timestamp},'${role}',0,0);`,
    `INSERT INTO account (id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES ('${randomUUID()}','${id}','credential','${id}','${hash}',${timestamp},${timestamp});`,
  );
}
for (const [offset, projectId] of testProjectIds.entries()) {
  const data = JSON.stringify({
    id: projectId,
    title: `Workspace test project ${offset + 1}`,
    dueDate: "",
    points: 100,
    content: "# Test",
  }).replace(/'/g, "''");
  setup.push(
    `INSERT INTO course_project (id,project_index,data,created_by,created_at,deleted) VALUES ('${projectId}',(SELECT COALESCE(MAX(project_index),0)+1 FROM course_project WHERE deleted=0),'${data}','${accounts[0].id}',${timestamp},0);`,
  );
}
try {
  executeLocal(setup.join("\n"));
  const [first, second] = accounts;
  const firstCookie = await login(first);
  const secondCookie = await login(second);
  assert.equal((await read("/api/session", firstCookie)).user.id, first.id);
  const [path, otherProject] = testProjectIds.map(
    (id) => "/api/projects/" + encodeURIComponent(id) + "/workspace",
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
  const adminCookie = await login(accounts[2]);
  const history = (workspace, account) =>
    workspace.replace(/workspace$/, "design-history") + "?userId=" + account.id;
  const url = history(path, first);
  assert.equal((await request(url, restored)).status, 403);
  assert.equal((await request(url + "&version=1", secondCookie)).status, 403);
  assert.deepEqual(await read(history(otherProject, first), adminCookie), { total: 0 });
  assert.deepEqual(await read(history(path, second), adminCookie), { total: 0 });
  assert.deepEqual(await read(url, adminCookie), { total: 2 });
  const initial = await read(url + "&version=1", adminCookie);
  assert.equal(initial.designDoc, draft.designDoc);
  assert.deepEqual(initial.model, draft.model);
  assert.equal(initial.repoUrl, undefined);
  const head = await read(path, restored);
  const batch = {
    revision: head.revision,
    writeId: randomUUID(),
    draft: { ...empty, designDoc: "定稿📚" },
    earlier: [{ designDoc: "刪改中📚" }, { designDoc: "初稿📚" }],
  };
  const batchWrite = () => request(path, restored, "PUT", batch, first.id);
  const [accepted, duplicate] = await Promise.all([batchWrite(), batchWrite()]);
  assert.equal(accepted.status, 200);
  const receipt = await accepted.json();
  assert.deepEqual(await duplicate.json(), receipt);
  assert.deepEqual(await (await batchWrite()).json(), receipt);
  assert.deepEqual(await read(url, adminCookie), { total: 5 });
  for (const [i, doc] of ["初稿📚", "刪改中📚", "定稿📚"].entries()) {
    const item = await read(url + "&version=" + (i + 3), adminCookie);
    assert.equal(item.designDoc, doc);
    assert.deepEqual(item.model, empty.model);
  }
  assert.equal(
    (await save(restored, first, receipt.revision, { ...batch.draft, repoUrl: "owner/repo" }))
      .status,
    200,
  );
  assert.deepEqual(await read(url, adminCookie), { total: 5 });
  assert.equal((await request(url + "&version=6", adminCookie)).status, 404);
  // Cross the periodic checkpoint while editing labels, geometry and relationships,
  // then revisit each state in reverse order, including returns to the empty graph.
  let parent = (await read(path, restored)).revision;
  const versions = Array.from({ length: 36 }, (_, i) => ({
    ...empty,
    designDoc: "反覆修訂📚" + i,
    model:
      i % 3 === 0
        ? empty.model
        : {
            ...draft.model,
            nodes: hugeNodes
              .slice(0, 2)
              .map((node) => ({ ...node, label: node.id + i, x: node.x + i })),
            relationships: draft.model.relationships.map((edge) => ({
              ...edge,
              label: "呼叫 " + i,
            })),
          },
  }));
  for (let offset = 0; offset < versions.length; offset += 12) {
    const group = versions.slice(offset, offset + 12);
    const response = await request(
      path,
      restored,
      "PUT",
      {
        revision: parent,
        draft: group.at(-1),
        earlier: group.slice(0, -1).reverse(),
      },
      first.id,
    );
    assert.equal(response.status, 200);
    parent = (await response.json()).revision;
  }
  assert.deepEqual(await read(url, adminCookie), { total: 41 });
  for (let i = versions.length - 1; i >= 0; i--) {
    const item = await read(url + "&version=" + (i + 6), adminCookie);
    assert.equal(item.designDoc, versions[i].designDoc);
    assert.deepEqual(item.model, versions[i].model);
  }
  assert.equal((await request(url + "&version=0", adminCookie)).status, 400);
  assert.equal((await request(history(path, accounts[2]), adminCookie)).status, 404);
  executeLocal(`UPDATE course_project SET deleted=1 WHERE id='${testProjectIds[0]}';`);
  assert.equal((await request(url, adminCookie)).status, 404);
  console.log(
    "Passed workspace isolation, concurrent saves, teacher access, retries, and exact replay of 41 design versions.",
  );
} finally {
  executeLocal(
    `DELETE FROM course_project WHERE id IN ('${testProjectIds[0]}', '${testProjectIds[1]}');\nDELETE FROM user WHERE id IN ('${accounts[0].id}', '${accounts[1].id}', '${accounts[2].id}');`,
  );
}
