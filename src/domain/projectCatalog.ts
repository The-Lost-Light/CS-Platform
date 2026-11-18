import type { Project } from "@domain/project";

export function mergeProjectCatalog(
  templates: Project[],
  stored: Project[],
  removedIds: string[],
): Project[] {
  const removed = new Set(removedIds);
  const overrides = new Map(stored.map((project) => [project.id, project]));
  const templateIds = new Set(templates.map((project) => project.id));
  return [
    ...templates.map((project) => overrides.get(project.id) ?? project),
    ...stored.filter((project) => !templateIds.has(project.id)),
  ].filter((project) => !removed.has(project.id));
}
