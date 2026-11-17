import type { Node } from "@xyflow/react";
import type { C4Kind } from "@domain/c4";

export type FlowNode = Node<
  {
    title: string;
    external: boolean;
    boundaryLabel: string;
    kind: C4Kind;
    description: string;
    technology: string;
    status: string;
    expandable: boolean;
    onSelect: () => void;
    onExplore: () => void;
  },
  "c4"
>;

export type BoundaryNode = Node<{ title: string }, "boundary">;
export type CanvasNode = FlowNode | BoundaryNode;
