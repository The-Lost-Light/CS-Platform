import type { C4File } from "@modules/c4-model";

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

export interface StudentWorkspaceSummary {
  id: string;
  name: string;
  email: string;
  hasWorkspace: boolean;
}
