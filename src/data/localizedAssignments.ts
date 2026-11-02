import { createAdvancedProjects, type AdvancedProject } from './assignmentsData';
import { createTranslator, type Locale } from '../i18n/messages';

export function getLocalizedAssignments(locale: Locale) {
  const t = createTranslator(locale);
  return {
    advancedProjects: createAdvancedProjects(t),
  };
}

/** Only replace untouched template fields; IDs, paths and student edits are stable. */
export function updateLocalizedProjectDraft(
  nodes: AdvancedProject['initialMindMapNodes'], designDoc: string,
  previous: AdvancedProject, next: AdvancedProject,
) {
  return {
    nodes: nodes.map(node => {
      const before = previous.initialMindMapNodes.find(item => item.id === node.id);
      const after = next.initialMindMapNodes.find(item => item.id === node.id);
      if (!before || !after) return node;
      return {
        ...node,
        label: node.label === before.label ? after.label : node.label,
        description: node.description === before.description ? after.description : node.description,
      };
    }),
    designDoc: designDoc === previous.initialDesignDoc ? next.initialDesignDoc : designDoc,
  };
}
