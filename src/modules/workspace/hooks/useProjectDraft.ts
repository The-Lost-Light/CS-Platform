import type { C4Node, C4Relationship } from "@modules/c4-model";
import { useState } from "react";

import type { PersonalWorkspace } from "../model/personalWorkspace";

export function useProjectDraft(initialDraft: PersonalWorkspace | null) {
  const [mindMapNodes, setMindMapNodes] = useState<C4Node[]>(() => initialDraft?.model.nodes ?? []);
  const [relationships, setRelationships] = useState<C4Relationship[]>(
    () => initialDraft?.model.relationships ?? [],
  );
  const [designDoc, setDesignDoc] = useState(() => initialDraft?.designDoc ?? "");
  return {
    mindMapNodes,
    setMindMapNodes,
    relationships,
    setRelationships,
    designDoc,
    setDesignDoc,
  };
}
