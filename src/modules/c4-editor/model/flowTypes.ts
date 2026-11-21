import type { Node } from "@xyflow/react";

export const C4_MIN_NODE_WIDTH = 120;
export const C4_MIN_NODE_HEIGHT = 100;

export type FlowNode = Node<
  {
    title: string;
    description: string;
    technology: string;
    expandable: boolean;
    onSelect: () => void;
    onExplore: () => void;
  },
  "c4"
>;

export type BoundaryNode = Node<{ title: string }, "boundary">;
export type CanvasNode = FlowNode | BoundaryNode;
