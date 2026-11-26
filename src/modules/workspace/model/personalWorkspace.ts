import type { C4File } from "@modules/c4-model";

export interface PersonalWorkspace {
  designDoc: string;
  model: C4File;
  repoUrl: string;
}

export interface WorkspaceSnapshot {
  accountId: string;
  revision: string | null;
  updatedAt: number | null;
  draft: PersonalWorkspace | null;
}

export type DesignContent = Pick<PersonalWorkspace, "designDoc" | "model">;
export type DesignEdit = DesignContent & { editedAt: number };
export type DesignVersion = DesignEdit & { version: number };
export const MAX_EDITS_PER_SAVE = 12;
export type PendingEdit = { draft: PersonalWorkspace; editedAt: number };
export type SaveBatch = { writeId: string; edits: PendingEdit[] };
export const emptyModel = (): PersonalWorkspace["model"] => ({
  format: "cap-c4",
  version: 1,
  nodes: [],
  relationships: [],
});

export interface StudentWorkspaceSummary {
  id: string;
  name: string;
  email: string;
  hasWorkspace: boolean;
  updatedAt: number | null;
}
