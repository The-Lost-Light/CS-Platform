import { applyCanvasLayout, BOUNDARY_ID } from "../model/canvasLayout";
import { createC4NodeInScope } from "@modules/c4-model";
import { prepareC4CanvasChanges } from "../model/canvasChanges";
import type { CanvasNode, FlowNode } from "../model/flowTypes";
import { NodeChangeset } from "@xyflow/react";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";

function card(id: string, x: number, y: number): FlowNode {
  return {
    id,
    type: "c4",
    position: { x, y },
    style: { width: 100, height: 100 },
    data: {
      title: id,
      external: false,
      boundaryLabel: "Internal",
      kind: "system",
      description: "",
      technology: "",
      status: "",
      expandable: false,
      onSelect: () => {},
      onExplore: () => {},
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
  assert.equal(local[0].selected, true);
  assert.equal(measured.completedMoves.toArray().length, 0);

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
  assert.equal(saved[0].width, 320);
  assert.equal(saved[0].height, 240);
  assert.equal(nodes[0].width, undefined);
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
  assert.equal(dragged.completedMoves.toArray().length, 0);

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
  assert.equal(dragged.completedMoves.toArray().length, 0);
  assert.equal(incoming.toArray().length, 1);

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
  assert.equal(stopped.movingIds, null);
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
  assert.equal(result[2], outside);
  assert.equal(scope.boundary, undefined);
});
