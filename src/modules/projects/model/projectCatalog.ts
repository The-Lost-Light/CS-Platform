import type { Project } from "./project";

export function mergeProjectCatalog(
  templates: Project[],
  stored: Project[],
  deletedIds: string[],
): Project[] {
  const deleted = new Set(deletedIds);
  const overrides = new Map(stored.map((project) => [project.id, project]));
  const templateIds = new Set(templates.map((project) => project.id));
  return [
    ...templates.map((project) => overrides.get(project.id) ?? project),
    ...stored.filter((project) => !templateIds.has(project.id)),
  ]
    .filter((project) => !deleted.has(project.id))
    .sort((a, b) => a.index - b.index)
    .map((project, index) => ({ ...project, index: index + 1 }));
}
