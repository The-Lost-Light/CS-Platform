import { isRecord } from "@shared/isRecord";

import type {
  PersonalWorkspace,
  StudentWorkspaceSummary,
  WorkspaceSnapshot,
} from "../model/personalWorkspace";

function workspaceUrl(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/workspace`;
}

async function loadWorkspaceJson<T>(
  projectId: string,
  query: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(workspaceUrl(projectId) + query, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Load failed");
  return response.json();
}

export async function loadSnapshot(
  projectId: string,
  accountId: string,
  signal: AbortSignal,
  forStudent = false,
) {
  const query = forStudent ? `?userId=${encodeURIComponent(accountId)}` : "";
  const snapshot = await loadWorkspaceJson<WorkspaceSnapshot>(projectId, query, signal);
  if (snapshot.accountId !== accountId) throw new Error("Session changed");
  return snapshot;
}

export async function loadStudentWorkspaces(
  projectId: string,
  signal: AbortSignal,
): Promise<StudentWorkspaceSummary[]> {
  const data = await loadWorkspaceJson<{ students: StudentWorkspaceSummary[] }>(
    projectId,
    "?list=students",
    signal,
  );
  return data.students;
}

export type SaveError =
  | "draft.conflict"
  | "draft.session"
  | "draft.tooLarge"
  | "draft.invalidRepo"
  | "draft.saveError";
export type SaveResult =
  | { ok: true; revision: string }
  | { ok: false; error: SaveError; retry: boolean };

export async function saveDraft(
  projectId: string,
  accountId: string,
  revision: string | null,
  draft: PersonalWorkspace,
): Promise<SaveResult> {
  const response = await fetch(workspaceUrl(projectId), {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Workspace-Account": accountId },
    body: JSON.stringify({ revision, draft }),
  });
  if (response.ok) {
    const data: { revision: string } = await response.json();
    return { ok: true, revision: data.revision };
  }
  let error: SaveError = "draft.saveError";
  if (response.status === 409) error = "draft.conflict";
  else if (response.status === 401 || response.status === 403) error = "draft.session";
  else if (response.status === 413) error = "draft.tooLarge";
  else if (response.status === 400) {
    const body = await response.json();
    if (isRecord(body) && body.error === "repo") error = "draft.invalidRepo";
  }
  return { ok: false, error, retry: response.status >= 500 };
}
