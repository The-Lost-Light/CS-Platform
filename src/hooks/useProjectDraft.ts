import { updateLocalizedProjectDraft } from "@data/localizedProjects";
import { migrateC4Nodes, type C4Relationship } from "@domain/c4";
import type { Project } from "@domain/project";
import { useEffect, useRef, useState } from "react";
import type { PersonalWorkspace } from "@domain/personalWorkspace";

/** Only an unsaved template follows changes to the project's language. */
export function useProjectDraft(
  project: Project,
  initialDraft: PersonalWorkspace | null,
  usingTemplate: boolean,
) {
  const [mindMapNodes, setMindMapNodes] = useState(
    () => initialDraft?.model.nodes ?? migrateC4Nodes(project.initialMindMapNodes),
  );
  const [relationships, setRelationships] = useState<C4Relationship[]>(
    () => initialDraft?.model.relationships ?? [],
  );
  const [designDoc, setDesignDoc] = useState(
    () => initialDraft?.designDoc ?? project.initialDesignDoc,
  );
  const previousProject = useRef(project);

  useEffect(() => {
    const previous = previousProject.current;
    previousProject.current = project;
    // The page remounts for each account/project. Personal snapshots keep
    // their original text when the surrounding interface changes language.
    if (usingTemplate && previous !== project && previous.id === project.id) {
      setMindMapNodes((nodes) => {
        const localized = updateLocalizedProjectDraft(nodes, "", previous, project).nodes;
        if (
          localized.every(
            (node, i) => node.label === nodes[i].label && node.description === nodes[i].description,
          )
        )
          return nodes;
        return nodes.map((node, index) => ({ ...node, ...localized[index] }));
      });
      setDesignDoc((doc) => updateLocalizedProjectDraft([], doc, previous, project).designDoc);
    }
  }, [project, usingTemplate]);

  return {
    mindMapNodes,
    setMindMapNodes,
    relationships,
    setRelationships,
    designDoc,
    setDesignDoc,
  };
}
