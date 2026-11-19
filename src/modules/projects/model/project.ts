export interface ProjectAttachment {
  id: string;
  name: string;
  size: number;
}

export interface Project {
  id: string;
  title: string;
  codeName: string;
  summary: string;
  dueDate: string;
  points: number;
  tags: string[];
  content: string;
  attachments: ProjectAttachment[];
}

export const MAX_ATTACHMENTS = 8;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_CONTENT_LENGTH = 40000;
