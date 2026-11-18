import type { C4File } from "@domain/c4File";

export interface PersonalWorkspace {
  designDoc: string;
  model: C4File;
  repoUrl: string;
}

export interface WorkspaceSnapshot {
  accountId: string;
  revision: string | null;
  draft: PersonalWorkspace | null;
}
