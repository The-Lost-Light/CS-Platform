import type { C4Node, C4Relationship } from "@modules/c4-model";

export type C4ArchitectProps = {
  nodes: C4Node[];
  onChangeNodes: (nodes: C4Node[]) => void;
  relationships: C4Relationship[];
  onChangeRelationships: (edges: C4Relationship[]) => void;
  designDoc: string;
  onChangeDesignDoc: (doc: string) => void;
};
