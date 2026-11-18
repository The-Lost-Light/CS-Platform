import { updateLocalizedProjectDraft } from "@data/localizedProjects";
import { migrateC4Nodes, type C4Relationship } from "@domain/c4";
import type { Project } from "@domain/project";
import { useEffect, useRef, useState } from "react";

/** Locale updates merge untouched template fields; project changes reset the draft. */
export function useProjectDraft(project: Project, onProjectChange: (url: string) => void) {
  const [mindMapNodes, setMindMapNodes] = useState(() =>
    migrateC4Nodes(project.initialMindMapNodes || []),
  );
  const [relationships, setRelationships] = useState<C4Relationship[]>([]);
  const [designDoc, setDesignDoc] = useState(project.initialDesignDoc || "");
  const previousProject = useRef(project);

  useEffect(() => {
    const previous = previousProject.current;
    previousProject.current = project;
    if (previous.id === project.id && previous !== project) {
      setMindMapNodes((nodes) => {
        const localized = updateLocalizedProjectDraft(nodes, "", previous, project).nodes;
        return nodes.map((node, index) => ({ ...node, ...localized[index] }));
      });
      setDesignDoc((doc) => updateLocalizedProjectDraft([], doc, previous, project).designDoc);
      return;
    }
    setMindMapNodes(migrateC4Nodes(project.initialMindMapNodes || []));
    setRelationships([]);
    setDesignDoc(project.initialDesignDoc || "");
    onProjectChange(project.defaultRepoUrl);
  }, [project]);

  return {
    mindMapNodes,
    setMindMapNodes,
    relationships,
    setRelationships,
    designDoc,
    setDesignDoc,
  };
}
