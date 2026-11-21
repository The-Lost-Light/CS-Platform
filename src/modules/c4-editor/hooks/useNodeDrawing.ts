import type { ReactFlowInstance, XYPosition } from "@xyflow/react";
import { useRef, useState, type PointerEvent, type RefObject } from "react";

import type { CanvasNode } from "../model/flowTypes";

export function canStartNodeDraw(
  creating: boolean,
  button: number,
  target: Pick<HTMLElement, "closest"> | null,
): boolean {
  if (!creating || button !== 0 || !target) return false;
  return (
    Boolean(target.closest(".react-flow__pane, .react-flow__node-boundary")) &&
    !target.closest(
      '.react-flow__node-c4, .react-flow__controls, .react-flow__minimap, [role="menu"]',
    )
  );
}

export function completeNodeDraw(
  start: XYPosition,
  end: XYPosition,
  screenToFlowPosition: (point: XYPosition) => XYPosition,
): { position: XYPosition; size?: { width: number; height: number } } {
  const from = screenToFlowPosition(start);
  const to = screenToFlowPosition(end);
  if (Math.hypot(end.x - start.x, end.y - start.y) < 5) {
    return { position: from, size: undefined };
  }
  return {
    position: { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y) },
    size: {
      width: Math.max(200, Math.abs(to.x - from.x)),
      height: Math.max(160, Math.abs(to.y - from.y)),
    },
  };
}

export function useNodeDrawing(
  flowInstance: RefObject<ReactFlowInstance<CanvasNode> | null>,
  addNode: (position: XYPosition, size?: { width: number; height: number }) => void,
) {
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [drawPreview, setDrawPreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  function toggleCreating() {
    drawStart.current = null;
    setDrawPreview(null);
    setCreating((current) => !current);
  }

  function startDrawing(event: PointerEvent<HTMLDivElement>) {
    if (!canStartNodeDraw(creating, event.button, event.target as HTMLElement | null)) return;
    event.preventDefault();
    event.stopPropagation();
    drawStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function previewDrawing(event: PointerEvent<HTMLDivElement>) {
    const start = drawStart.current;
    if (!start) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDrawPreview({
      x: Math.min(start.x, event.clientX) - rect.left,
      y: Math.min(start.y, event.clientY) - rect.top,
      width: Math.abs(event.clientX - start.x),
      height: Math.abs(event.clientY - start.y),
    });
  }

  function finishDrawing(event: PointerEvent<HTMLDivElement>) {
    const start = drawStart.current;
    if (!start || event.button !== 0) return;
    drawStart.current = null;
    setDrawPreview(null);
    setCreating(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const flow = flowInstance.current;
    if (!flow) return;
    const result = completeNodeDraw(start, { x: event.clientX, y: event.clientY }, (point) =>
      flow.screenToFlowPosition(point),
    );
    addNode(result.position, result.size);
  }

  function abortDrawing() {
    drawStart.current = null;
    setDrawPreview(null);
  }

  function cancelDrawing() {
    if (drawStart.current !== null) drawStart.current = null;
    setDrawPreview((previous) => (previous === null ? previous : null));
    setCreating((previous) => (previous ? false : previous));
  }

  return {
    creating,
    preview: drawPreview,
    toggleCreating,
    startDrawing,
    previewDrawing,
    finishDrawing,
    abortDrawing,
    cancelDrawing,
  };
}
