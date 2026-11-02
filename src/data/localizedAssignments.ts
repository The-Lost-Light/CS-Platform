import { ADVANCED_PROJECTS, BASIC_ASSIGNMENTS, type AdvancedProject, type BasicAssignment } from './assignmentsData';
import { createTranslator, type Locale, type Translator } from '../i18n/messages';

function localizeBasic(assignment: BasicAssignment, t: Translator): BasicAssignment {
  return {
    ...assignment,
    title: t(assignment.title),
    difficulty: t(assignment.difficulty),
    status: t(assignment.status),
    summary: t(assignment.summary),
    description: t(assignment.description),
    inputFormat: t(assignment.inputFormat),
    outputFormat: t(assignment.outputFormat),
    constraints: assignment.constraints.map(text => t(text)),
    aiHints: assignment.aiHints.map(text => t(text)),
    starterCode: t(assignment.starterCode),
    sampleCases: assignment.sampleCases.map(sample => ({
      ...sample, name: t(sample.name), explanation: t(sample.explanation),
    })),
  };
}

function localizeAdvanced(project: AdvancedProject, t: Translator): AdvancedProject {
  return {
    ...project,
    title: t(project.title),
    difficulty: t(project.difficulty),
    status: t(project.status),
    summary: t(project.summary),
    requirements: project.requirements.map(text => t(text)),
    initialDesignDoc: t(project.initialDesignDoc),
    initialMindMapNodes: project.initialMindMapNodes.map(node => ({
      ...node, label: t(node.label), description: t(node.description),
    })),
  };
}

export function getLocalizedAssignments(locale: Locale) {
  const t = createTranslator(locale);
  return {
    basicAssignments: BASIC_ASSIGNMENTS.map(assignment => localizeBasic(assignment, t)),
    advancedProjects: ADVANCED_PROJECTS.map(project => localizeAdvanced(project, t)),
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
