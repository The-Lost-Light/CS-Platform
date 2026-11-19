import { createC4NodeInScope } from "@modules/c4-model";
import { NodeChangeset } from "@xyflow/react";
import { assert, test } from "vite-plus/test";

import { applyCanvasLayout } from "@/modules/c4-editor/model/canvasLayout";
import type { CanvasNode } from "@/modules/c4-editor/model/flowTypes";
import {
  createC4History,
  reduceC4History,
  removeC4Elements,
} from "@/modules/c4-editor/model/modelHistory";

const root = createC4NodeInScope([], "", "system", "System")!;
const child = createC4NodeInScope([root], root.id, "db", "Database")!;
const client = { ...root, id: "client", label: "Client" };
const edge = {
  id: "query",
  source: client.id,
  target: child.id,
  label: "Queries",
  technology: "SQL",
};
const initial = createC4History({ nodes: [root, child, client], relationships: [edge] });
const boundary = { x: -40, y: -70, width: 600, height: 360 };

test("one undo restores a deleted subtree and its connections, and redo removes both", () => {
  const deleted = reduceC4History(initial, {
    type: "edit",
    apply: (graph) => removeC4Elements(graph, [root.id], []),
  });
  assert.deepEqual(deleted.present, { nodes: [client], relationships: [] });
  const undone = reduceC4History(deleted, { type: "undo" });
  assert.deepEqual(undone.present, initial.present);
  assert.deepEqual(undone.past, []);
  assert.strictEqual(reduceC4History(undone, { type: "undo" }), undone);
  const redone = reduceC4History(undone, { type: "redo" });
  assert.deepEqual(redone.present, deleted.present);
  assert.strictEqual(reduceC4History(redone, { type: "redo" }), redone);
});

test("resize updates from the same gesture form one step; a new gesture gets its own step", () => {
  function resize(width: number, group: symbol) {
    const changes = new NodeChangeset<CanvasNode>([
      {
        id: root.id,
        type: "dimensions",
        resizing: true,
        setAttributes: true,
        dimensions: { width, height: 200 },
      },
    ]);
    return {
      type: "edit" as const,
      group,
      apply: (graph: typeof initial.present) => ({
        ...graph,
        nodes: applyCanvasLayout(graph.nodes, changes, undefined, boundary),
      }),
    };
  }
  const gesture = Symbol();
  const first = reduceC4History(initial, resize(300, gesture));
  const second = reduceC4History(first, resize(400, gesture));
  const third = reduceC4History(second, resize(500, Symbol()));
  const undone = reduceC4History(third, { type: "undo" });
  assert.strictEqual(undone.present.nodes[0].width, 400);
  assert.deepEqual(reduceC4History(undone, { type: "undo" }).present, initial.present);
  assert.strictEqual(reduceC4History(undone, { type: "redo" }).present.nodes[0].width, 500);
});

test("a no-op drag preserves redo and a new edge edit clears it", () => {
  const move = (x: number) => {
    const changes = new NodeChangeset<CanvasNode>([
      { type: "position", id: root.id, dragging: false, position: { x, y: root.y } },
    ]);
    return {
      type: "edit" as const,
      apply: (graph: typeof initial.present) => ({
        ...graph,
        nodes: applyCanvasLayout(graph.nodes, changes, undefined, boundary),
      }),
    };
  };
  const moved = reduceC4History(initial, move(root.x + 30));
  assert.strictEqual(moved.present.nodes[0].x, root.x + 30);
  const undone = reduceC4History(moved, { type: "undo" });
  assert.strictEqual(reduceC4History(undone, move(root.x)), undone);
  const deleted = reduceC4History(undone, {
    type: "edit",
    apply: (graph) => removeC4Elements(graph, [], [edge.id]),
  });
  assert.deepEqual(deleted.future, []);
  assert.deepEqual(deleted.present.nodes, initial.present.nodes);
  assert.deepEqual(deleted.present.relationships, []);
});
