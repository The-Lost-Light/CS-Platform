import { useRef, useState, type PointerEvent, type RefObject } from "react";
import type { ReactFlowInstance, XYPosition } from "@xyflow/react";
import type { CanvasNode } from "../model/flowTypes";

export function useNodeDrawing(
  flowInstance: RefObject<ReactFlowInstance<CanvasNode> | null>,
  addNode: (position: XYPosition, size?: { width: number; height: number }) => void,
) {
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  function startDrawing(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 2) return;
    const target = event.target as HTMLElement;
    if (
      !target.closest(".react-flow__pane, .react-flow__node-boundary") ||
      target.closest(".react-flow__node-c4, .react-flow__controls, .react-flow__minimap")
    )
      return;
    event.preventDefault();
    drawStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
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
    if (!start || event.button !== 2) return;
    drawStart.current = null;
    setDrawPreview(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
    const flow = flowInstance.current;
    if (!flow) return;
    const from = flow.screenToFlowPosition(start);
    const to = flow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5) addNode(from);
    else
      addNode(
        { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y) },
        {
          width: Math.max(200, Math.abs(to.x - from.x)),
          height: Math.max(160, Math.abs(to.y - from.y)),
        },
      );
  }
  function cancelDrawing() {
    drawStart.current = null;
    setDrawPreview(null);
  }
  return { preview: drawPreview, startDrawing, previewDrawing, finishDrawing, cancelDrawing };
}
