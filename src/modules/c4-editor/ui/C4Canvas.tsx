import {
  Handle,
  NodeResizer,
  Position,
  ReactFlow,
  type NodeProps,
  type ReactFlowProps,
} from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

import { prepareC4CanvasChanges } from "../model/canvasChanges";
import type { BoundaryNode, CanvasNode, FlowNode } from "../model/flowTypes";

function C4Card({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={data.title}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Enter" && event.shiftKey) data.onExplore();
          else data.onSelect();
        }
      }}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 160,
        backgroundColor: "var(--c4-node-bg)",
        borderColor: selected
          ? "var(--primary)"
          : data.expandable
            ? "var(--c4-expandable-border)"
            : "var(--c4-leaf-border)",
      }}
      className={`rounded-xl border-2 p-4 shadow-m3-1 transition-all flex flex-col justify-between text-on-surface ${
        selected ? "ring-4 ring-primary/25 shadow-m3-2" : "hover:shadow-m3-2"
      }`}
    >
      <NodeResizer isVisible={selected} minWidth={200} minHeight={160} color="var(--primary)" />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3! h-3! bg-secondary! border-2! border-surface!"
      />
      <div className="min-h-0 overflow-y-auto nowheel">
        <div className="text-sm font-bold text-on-surface wrap-break-word">{data.title}</div>
        {data.technology && (
          <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded-lg bg-surface-high text-[11px] font-mono text-primary wrap-break-word">
            [{data.technology}]
          </div>
        )}
        <p className="mt-2 text-xs text-on-muted wrap-break-word whitespace-pre-wrap leading-relaxed">
          {data.description}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3! h-3! bg-primary! border-2! border-surface!"
      />
    </div>
  );
}

function C4BoundaryCard({ data, selected }: NodeProps<BoundaryNode>) {
  return (
    <div className="c4-boundary-drag h-full w-full rounded-2xl border-2 border-dashed border-primary/70 bg-primary/5 cursor-move">
      <NodeResizer isVisible={selected} minWidth={360} minHeight={260} color="var(--primary)" />
      <div className="px-4 py-3 text-sm font-bold text-primary">{data.title}</div>
    </div>
  );
}
export const nodeTypes = { c4: C4Card, boundary: C4BoundaryCard };

/** Keep measurements local; persist user resizes and completed moves. */
export function C4Canvas({ nodes = [], onNodesChange, ...props }: ReactFlowProps<CanvasNode>) {
  const [canvasNodes, setCanvasNodes] = useState(nodes);
  const movingIds = useRef<string[] | null>(null);
  useEffect(() => {
    setCanvasNodes((previous) => {
      const byId = new Map(previous.map((node) => [node.id, node]));
      // Drop transient React Flow resize attributes when applying model geometry.
      return nodes.map((node) => ({
        ...byId.get(node.id),
        width: undefined,
        height: undefined,
        ...node,
      }));
    });
  }, [nodes]);
  return (
    <ReactFlow<CanvasNode>
      {...props}
      nodes={canvasNodes}
      onNodesChange={(changes) => {
        const update = prepareC4CanvasChanges(changes, canvasNodes, movingIds.current);
        movingIds.current = update.movingIds;
        setCanvasNodes((previous) => update.changes.applyTo(previous));
        if (update.completedMoves.toArray().length) {
          onNodesChange?.(update.completedMoves);
        }
      }}
    />
  );
}
