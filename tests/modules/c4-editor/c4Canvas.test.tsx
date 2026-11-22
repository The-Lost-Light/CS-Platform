import { BOUNDARY_ID, createC4NodeInScope } from "@modules/c4-model";
import { NodeChangeset } from "@xyflow/react";
import { assert, test } from "vite-plus/test";

import { canStartNodeDraw, completeNodeDraw } from "@/modules/c4-editor/hooks/useNodeDrawing";
import { prepareC4CanvasChanges } from "@/modules/c4-editor/model/canvasChanges";
import { applyCanvasLayout } from "@/modules/c4-editor/model/canvasLayout";
import type { CanvasNode, FlowNode } from "@/modules/c4-editor/model/flowTypes";

function card(id: string, x: number, y: number): FlowNode {
  return {
    id,
    type: "c4",
    position: { x, y },
    style: { width: 100, height: 100 },
    data: {
      title: id,
      description: "",
      technology: "",
      expandable: false,
    },
  };
}

test("canvas measurements and selection stay local while user resizes persist", () => {
  const nodes = [card("node", 0, 0)];
  const measured = prepareC4CanvasChanges(
    new NodeChangeset<CanvasNode>([
      {
        id: "node",
        type: "dimensions",
        dimensions: { width: 100, height: 100 },
      },
      { id: "node", type: "select", selected: true },
    ]),
    nodes,
    null,
  );
  const local = measured.changes.applyTo(nodes);
  assert.deepEqual(local[0].measured, { width: 100, height: 100 });
  assert.strictEqual(local[0].selected, true);
  assert.strictEqual(measured.completedMoves.toArray().length, 0);

  const resized = prepareC4CanvasChanges(
    new NodeChangeset<CanvasNode>([
      {
        id: "node",
        type: "dimensions",
        dimensions: { width: 320, height: 240 },
        setAttributes: true,
      },
    ]),
    local,
    null,
  );
  const saved = resized.completedMoves.applyTo(nodes);
  assert.strictEqual(saved[0].width, 320);
  assert.strictEqual(saved[0].height, 240);
  assert.strictEqual(nodes[0].width, undefined);
});

test("node drags update the canvas immediately and persist only on completion", () => {
  const nodes = [card("node", 0, 0)];
  const dragged = prepareC4CanvasChanges(
    new NodeChangeset<CanvasNode>([
      {
        id: "node",
        type: "position",
        position: { x: 25, y: 40 },
        dragging: true,
      },
    ]),
    nodes,
    null,
  );
  assert.deepEqual(dragged.changes.applyTo(nodes)[0].position, {
    x: 25,
    y: 40,
  });
  assert.strictEqual(dragged.completedMoves.toArray().length, 0);

  const stopped = prepareC4CanvasChanges(
    new NodeChangeset<CanvasNode>([
      {
        id: "node",
        type: "position",
        position: { x: 30, y: 45 },
        dragging: false,
      },
    ]),
    dragged.changes.applyTo(nodes),
    null,
  );
  assert.deepEqual(stopped.completedMoves.applyTo(nodes)[0].position, {
    x: 30,
    y: 45,
  });
});

test("boundary drags keep the original overlapping group and persist its final positions", () => {
  const nodes: CanvasNode[] = [
    {
      id: "__c4_boundary__",
      type: "boundary",
      position: { x: 0, y: 0 },
      style: { width: 400, height: 300 },
      data: { title: "Boundary" },
    },
    card("inside", 50, 50),
    card("overlap", 390, 50),
    card("outside", 500, 50),
  ];
  const incoming = new NodeChangeset<CanvasNode>([
    {
      id: "__c4_boundary__",
      type: "position",
      position: { x: 200, y: 10 },
      dragging: true,
    },
  ]);
  const dragged = prepareC4CanvasChanges(incoming, nodes, null);
  const local = dragged.changes.applyTo(nodes);
  assert.deepEqual(dragged.movingIds, ["inside", "overlap"]);
  assert.deepEqual(
    local.map((node) => node.position),
    [
      { x: 200, y: 10 },
      { x: 250, y: 60 },
      { x: 590, y: 60 },
      { x: 500, y: 50 },
    ],
  );
  assert.strictEqual(dragged.completedMoves.toArray().length, 0);
  assert.strictEqual(incoming.toArray().length, 1);

  const stopped = prepareC4CanvasChanges(
    new NodeChangeset<CanvasNode>([
      {
        id: "__c4_boundary__",
        type: "position",
        position: { x: 220, y: 20 },
        dragging: false,
      },
    ]),
    local,
    dragged.movingIds,
  );
  assert.strictEqual(stopped.movingIds, null);
  assert.deepEqual(
    stopped.completedMoves.applyTo(nodes).map((node) => node.position),
    [
      { x: 220, y: 20 },
      { x: 270, y: 70 },
      { x: 610, y: 70 },
      { x: 500, y: 50 },
    ],
  );
});

test("persisted geometry uses scope coordinates and leaves other levels alone", () => {
  const scope = createC4NodeInScope([], "", "scope", "API")!;
  const child = createC4NodeInScope([scope], scope.id, "child", "Database")!;
  const outside = { ...scope, id: "outside" };
  const frame = { x: -40, y: -70, width: 600, height: 360 };
  const result = applyCanvasLayout(
    [scope, child, outside],
    new NodeChangeset<CanvasNode>([
      { type: "position", id: BOUNDARY_ID, position: { x: 0, y: 5 } },
      { type: "dimensions", id: BOUNDARY_ID, dimensions: { width: 700, height: 500 } },
      { type: "dimensions", id: child.id, dimensions: { width: 250, height: 161 } },
      { type: "position", id: child.id, position: { x: 50, y: 90 } },
      { type: "position", id: outside.id, position: { x: 50, y: 90 } },
    ]),
    scope,
    frame,
  );
  assert.deepEqual(result[0].boundary, { x: 0, y: 5, width: 700, height: 500 });
  assert.deepEqual(result[1], { ...child, x: 10, y: 20, width: 250, height: 161 });
  assert.strictEqual(result[2], outside);
  assert.strictEqual(scope.boundary, undefined);
});

test("resizing the boundary from the left leaves nodes in place", () => {
  const nodes: CanvasNode[] = [
    {
      id: BOUNDARY_ID,
      type: "boundary",
      position: { x: 0, y: 0 },
      style: { width: 800, height: 400 },
      data: { title: "System" },
    },
    card("child", 100, 50),
  ];
  const resize = prepareC4CanvasChanges(
    new NodeChangeset<CanvasNode>([
      { type: "position", id: BOUNDARY_ID, position: { x: 200, y: 0 } },
      {
        type: "dimensions",
        id: BOUNDARY_ID,
        dimensions: { width: 600, height: 400 },
        setAttributes: true,
      },
    ]),
    nodes,
    null,
  );
  const resized = resize.changes.applyTo(nodes);
  assert.deepEqual(resized[1].position, nodes[1].position);
});

test("node drawing only starts with left click in creation mode on empty canvas or boundary", () => {
  const targetWith = (matches: string[]) => ({
    closest: (selector: string) =>
      selector
        .split(",")
        .map((part) => part.trim())
        .some((part) => matches.includes(part))
        ? ({} as Element)
        : null,
  });

  assert.isFalse(canStartNodeDraw(false, 0, targetWith([".react-flow__pane"])));
  assert.isFalse(canStartNodeDraw(true, 2, targetWith([".react-flow__pane"])));
  assert.isFalse(canStartNodeDraw(true, 1, targetWith([".react-flow__pane"])));
  assert.isTrue(canStartNodeDraw(true, 0, targetWith([".react-flow__pane"])));
  assert.isTrue(canStartNodeDraw(true, 0, targetWith([".react-flow__node-boundary"])));
  assert.isFalse(
    canStartNodeDraw(true, 0, targetWith([".react-flow__pane", ".react-flow__node-c4"])),
  );
  assert.isFalse(
    canStartNodeDraw(true, 0, targetWith([".react-flow__pane", ".react-flow__controls"])),
  );
  assert.isFalse(
    canStartNodeDraw(true, 0, targetWith([".react-flow__pane", ".react-flow__minimap"])),
  );
  assert.isFalse(canStartNodeDraw(true, 0, targetWith([".react-flow__pane", '[role="menu"]'])));
});

test("single left click uses default size while left drag clamps position and minimum size", () => {
  const identity = (point: { x: number; y: number }) => point;

  assert.deepEqual(completeNodeDraw({ x: 100, y: 200 }, { x: 102, y: 201 }, identity), {
    position: { x: 100, y: 200 },
    size: undefined,
  });

  assert.deepEqual(completeNodeDraw({ x: 300, y: 250 }, { x: 250, y: 200 }, identity), {
    position: { x: 250, y: 200 },
    size: { width: 120, height: 100 },
  });

  assert.deepEqual(completeNodeDraw({ x: 100, y: 100 }, { x: 420, y: 340 }, identity), {
    position: { x: 100, y: 100 },
    size: { width: 320, height: 240 },
  });
});
