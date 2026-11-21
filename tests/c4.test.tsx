import {
  c4Drilldown,
  canExploreC4Node,
  createC4NodeInScope,
  overlapsC4Boundary,
  removeC4Nodes,
  type C4Node,
} from "@modules/c4-model";
import { assert, test } from "vite-plus/test";

import { sampleC4Nodes as nodes } from "./fixtures/c4Model";

test("new nodes are placed below the full height of resized siblings", () => {
  const siblings = [
    { ...nodes[0], y: 100, height: 600 },
    { ...nodes[0], id: "other", y: 400, height: 160 },
  ];
  assert.strictEqual(createC4NodeInScope(siblings, "", "new", "New")?.y, 750);
});

test("an empty node opens its own boundary and accepts its first child", () => {
  const empty = c4Drilldown(nodes, "node-db");
  assert.strictEqual(empty.scope?.id, "node-db");
  assert.deepEqual(empty.visible, []);
  assert.deepEqual(
    empty.path.map((node) => node.id),
    ["node-root", "node-db"],
  );
  const child = createC4NodeInScope(nodes, "node-db", "db-child", "Database component")!;
  assert.strictEqual(child.kind, "component");
  const populated = c4Drilldown([...nodes, child], "node-db");
  assert.deepEqual(
    populated.visible.map((node) => node.id),
    ["db-child"],
  );
});

test("new nodes belong to the current scope and infer their C4 level", () => {
  for (const [scopeId, kind] of [
    ["", "system"],
    ["node-root", "container"],
    ["node-fe-core", "component"],
    ["node-editor", "code"],
  ]) {
    const created = createC4NodeInScope(nodes, scopeId, "new-node", "New node")!;
    assert.strictEqual(created.kind, kind);
    assert.strictEqual(created.parentId, scopeId || null);
    const view = c4Drilldown([...nodes, created], scopeId);
    assert.ok(view.visible.some((node) => node.id === created.id));
    assert.ok(
      view.visible
        .filter((node) => node.id !== created.id)
        .every((node) => node.y + 230 < created.y),
    );
  }
  const created = createC4NodeInScope([], "", "root", "First system")!;
  assert.strictEqual(created.kind, "system");
  assert.strictEqual(created.y, 0);
  assert.strictEqual(createC4NodeInScope(nodes, "deleted", "new", "New"), undefined);
  const leaf: C4Node = { ...created, kind: "code" };
  assert.strictEqual(createC4NodeInScope([leaf], leaf.id, "new", "New"), undefined);
  const person = { ...leaf, kind: "person" as const };
  assert.strictEqual(createC4NodeInScope([person], person.id, "child", "New")?.parentId, person.id);
});

test("creation preserves the requested position and stops at four levels regardless of kind", () => {
  const chain: C4Node[] = [];
  for (let depth = 0; depth < 4; depth++) {
    const node = createC4NodeInScope(chain, chain.at(-1)?.id ?? "", `level-${depth}`, "Node", {
      x: -120.5,
      y: 88,
    })!;
    assert.ok(node);
    assert.strictEqual(node.x, -120.5);
    assert.strictEqual(node.y, 88);
    chain.push(node);
  }
  assert.strictEqual(createC4NodeInScope(chain, chain[3].id, "fifth", "Node"), undefined);
  const wrongKinds = chain.map((node) => ({
    ...node,
    kind: "system" as const,
  }));
  assert.strictEqual(createC4NodeInScope(wrongKinds, chain[3].id, "fifth", "Node"), undefined);
  assert.strictEqual(c4Drilldown(chain, chain[3].id).path.length, 3);
});

test("drilldown hides enclosing peers by default and keeps them available for manual addition", () => {
  const person: C4Node = {
    ...nodes[0],
    id: "user",
    kind: "person",
    parentId: null,
  };
  const code: C4Node = {
    ...nodes[0],
    id: "class",
    kind: "code",
    parentId: "node-editor",
  };
  const all = [...nodes, person, code];
  const root = c4Drilldown(all, "");
  assert.deepEqual(
    root.visible.map((node) => node.id),
    ["node-root", "user"],
  );
  for (const id of ["node-root", "node-fe-core", "node-editor"]) {
    const next = c4Drilldown(all, id);
    assert.ok(next.visible.every((node) => node.parentId === id));
    assert.strictEqual(new Set(next.visible.map((node) => node.id)).size, next.visible.length);
  }
  const deep = c4Drilldown(all, "node-editor");
  assert.deepEqual(
    deep.visible.map((node) => node.id),
    ["class"],
  );
  assert.deepEqual(
    deep.path.map((node) => node.id),
    ["node-root", "node-fe-core", "node-editor"],
  );
});

test("missing or deleted scope returns to context without stale boundary or breadcrumbs", () => {
  const view = c4Drilldown(removeC4Nodes(nodes, ["node-fe-core"]), "node-editor");
  assert.strictEqual(view.scope, undefined);
  assert.deepEqual(view.path, []);
  assert.ok(view.visible.every((node) => !node.parentId));
});
test("removing a system recursively removes descendants including code elements", () => {
  const code: C4Node = {
    ...nodes[0],
    id: "class",
    kind: "code",
    parentId: "node-editor",
  };
  assert.deepEqual(removeC4Nodes([...nodes, code], ["node-root"]), []);
  const remaining = removeC4Nodes([...nodes, code], ["node-fe-core"]);
  assert.ok(!remaining.some((node) => ["node-fe-core", "node-editor", "class"].includes(node.id)));
  assert.ok(remaining.some((node) => node.id === "node-api"));
});
test("nodes moved outside the scope boundary stay in their level and remain explorable", () => {
  const scope = { ...nodes[0], boundary: { x: 100, y: 100, width: 400, height: 300 } };
  const child = { ...nodes[1], x: 460, y: 30 };
  const descendant = nodes[2];
  const graph = [scope, child, descendant];
  assert.deepEqual(c4Drilldown(graph, scope.id).visible, [child]);
  assert.isTrue(canExploreC4Node(graph, child.id));
  assert.isTrue(canExploreC4Node(graph, descendant.id));
  assert.deepEqual(c4Drilldown(graph, child.id).visible, [descendant]);
  assert.strictEqual(createC4NodeInScope(graph, child.id, "new", "New")?.parentId, child.id);
});

test("boundary movement includes partial overlaps but excludes separated nodes", () => {
  const boundary = { x: 100, y: 100, width: 400, height: 300 };
  for (const [x, y] of [
    [150, 150],
    [50, 150],
    [490, 150],
    [150, 50],
    [150, 390],
    [50, 50],
  ]) {
    assert.strictEqual(overlapsC4Boundary({ x, y, width: 100, height: 100 }, boundary), true);
  }
  for (const [x, y] of [
    [0, 0],
    [500, 150],
    [150, 400],
    [-100, 150],
  ]) {
    assert.strictEqual(overlapsC4Boundary({ x, y, width: 100, height: 100 }, boundary), false);
  }
});
