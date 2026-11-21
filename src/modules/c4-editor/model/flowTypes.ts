import type { Node } from "@xyflow/react";

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
