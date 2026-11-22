export {
  type Project,
  type ProjectAttachment,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_CONTENT_LENGTH,
  PROJECT_FIELD_LIMITS,
  MAX_PROJECT_POINTS,
  attachmentsWithinLimit,
} from "./model/project";
export { parseProjectInput } from "./model/projectInput";
export { mergeProjectCatalog } from "./model/projectCatalog";
export { PROJECTS } from "./data/projectsData";
export { getLocalizedProjects } from "./data/localizedProjects";
