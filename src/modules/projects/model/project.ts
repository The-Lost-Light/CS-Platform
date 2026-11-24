export interface ProjectAttachment {
  id: string;
  name: string;
  size: number;
}

export interface ProjectWorkspaceStatus {
  hasWorkspace: boolean;
  updatedAt: number | null;
}

export interface Project {
  id: string;
  index: number;
  title: string;
  dueDate: string;
  points: number;
  tags: string[];
  content: string;
  attachments: ProjectAttachment[];
}

export const MAX_ATTACHMENTS = 8;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_CONTENT_LENGTH = 40000;

export const PROJECT_FIELD_LIMITS = {
  title: 120,
  dueDate: 16,
  tags: 500,
  content: MAX_CONTENT_LENGTH,
} as const;
export const MAX_PROJECT_POINTS = 10000;

export function attachmentsWithinLimit(files: readonly Pick<ProjectAttachment, "size">[]) {
  return (
    files.length <= MAX_ATTACHMENTS &&
    files.reduce((sum, file) => sum + file.size, 0) <= MAX_ATTACHMENT_BYTES
  );
}
