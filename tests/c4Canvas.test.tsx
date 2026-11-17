import assert from "node:assert/strict";
import test from "node:test";
import { NodeChangeset } from "@xyflow/react";
import { prepareC4CanvasChanges } from "@pages/project/c4/canvasChanges";
import type { CanvasNode, FlowNode } from "@pages/project/c4/flowTypes";

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
  const measured = prepareC4CanvasChanges(new NodeChangeset<CanvasNode>([
    { id: "node", type: "dimensions", dimensions: { width: 100, height: 100 } },
    { id: "node", type: "select", selected: true },
  ]), nodes, null);
  const local = measured.changes.applyTo(nodes);
  assert.deepEqual(local[0].measured, { width: 100, height: 100 });
  assert.equal(local[0].selected, true);
  assert.equal(measured.completedMoves.toArray().length, 0);

  const resized = prepareC4CanvasChanges(new NodeChangeset<CanvasNode>([
    { id: "node", type: "dimensions", dimensions: { width: 320, height: 240 }, setAttributes: true },
  ]), local, null);
  const saved = resized.completedMoves.applyTo(nodes);
  assert.equal(saved[0].width, 320);
  assert.equal(saved[0].height, 240);
  assert.equal(nodes[0].width, undefined);
});

test("node drags update the canvas immediately and persist only on completion", () => {
  const nodes = [card("node", 0, 0)];
  const dragged = prepareC4CanvasChanges(new NodeChangeset<CanvasNode>([
    { id: "node", type: "position", position: { x: 25, y: 40 }, dragging: true },
  ]), nodes, null);
  assert.deepEqual(dragged.changes.applyTo(nodes)[0].position, { x: 25, y: 40 });
  assert.equal(dragged.completedMoves.toArray().length, 0);

  const stopped = prepareC4CanvasChanges(new NodeChangeset<CanvasNode>([
    { id: "node", type: "position", position: { x: 30, y: 45 }, dragging: false },
  ]), dragged.changes.applyTo(nodes), null);
  assert.deepEqual(stopped.completedMoves.applyTo(nodes)[0].position, { x: 30, y: 45 });
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
    { id: "__c4_boundary__", type: "position", position: { x: 200, y: 10 }, dragging: true },
  ]);
  const dragged = prepareC4CanvasChanges(incoming, nodes, null);
  const local = dragged.changes.applyTo(nodes);
  assert.deepEqual(dragged.movingIds, ["inside", "overlap"]);
  assert.deepEqual(local.map(node => node.position), [
    { x: 200, y: 10 }, { x: 250, y: 60 }, { x: 590, y: 60 }, { x: 500, y: 50 },
  ]);
  assert.equal(dragged.completedMoves.toArray().length, 0);
  assert.equal(incoming.toArray().length, 1);

  const stopped = prepareC4CanvasChanges(new NodeChangeset<CanvasNode>([
    { id: "__c4_boundary__", type: "position", position: { x: 220, y: 20 }, dragging: false },
  ]), local, dragged.movingIds);
  assert.equal(stopped.movingIds, null);
  assert.deepEqual(stopped.completedMoves.applyTo(nodes).map(node => node.position), [
    { x: 220, y: 20 }, { x: 270, y: 70 }, { x: 610, y: 70 }, { x: 500, y: 50 },
  ]);
});
