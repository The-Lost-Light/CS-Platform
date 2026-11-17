import type { C4Node, C4Relationship } from '../../../domain/c4';

export type C4ArchitectProps = {
  nodes: C4Node[];
  onChangeNodes: (nodes: C4Node[]) => void;
  relationships: C4Relationship[];
  onChangeRelationships: (edges: C4Relationship[]) => void;
  designDoc: string;
  onChangeDesignDoc: (doc: string) => void;
};
