import { isRecord } from "@shared/isRecord";

import type {
  DesignVersion,
  SaveBatch,
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
  | "draft.deadlinePassed"
  | "draft.tooLarge"
  | "draft.invalidRepo"
  | "draft.saveError";

export async function loadDesignHistory<T extends { total: number } | DesignVersion>(
  projectId: string,
  accountId: string,
  version: number | null,
  signal: AbortSignal,
): Promise<T> {
  const params = new URLSearchParams({ userId: accountId });
  if (version !== null) params.set("version", String(version));
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/design-history?${params}`,
    { cache: "no-store", signal },
  );
  if (!response.ok) throw new Error("History unavailable");
  return response.json();
}
export type SaveResult =
  | { ok: true; revision: string; updatedAt: number }
  | { ok: false; error: SaveError; retry: boolean; invalidContent?: boolean };

export async function saveDraft(
  projectId: string,
  accountId: string,
  revision: string | null,
  batch: SaveBatch,
): Promise<SaveResult> {
  const { draft, editedAt } = batch.edits[batch.edits.length - 1];
  const earlier = [];
  let earlierBytes = 0;
  for (let i = batch.edits.length - 2; i >= 0; i--) {
    const edit = batch.edits[i];
    const next = batch.edits[i + 1].draft;
    const item = {
      editedAt: edit.editedAt,
      designDoc: edit.draft.designDoc === next.designDoc ? undefined : edit.draft.designDoc,
      model: edit.draft.model === next.model ? undefined : edit.draft.model,
    };
    earlierBytes += new Blob([JSON.stringify(item)]).size;
    if (earlierBytes > 1024 * 1024) return { ok: false, error: "draft.tooLarge", retry: false };
    earlier.push(item);
  }
  const body = JSON.stringify({ revision, draft, editedAt, earlier, writeId: batch.writeId });
  const bytes = new Blob([body]).size;
  if (bytes > 6 * 1024 * 1024) return { ok: false, error: "draft.tooLarge", retry: false };
  const response = await fetch(workspaceUrl(projectId), {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Workspace-Account": accountId },
    body,
    keepalive: bytes <= 60 * 1024 && document.visibilityState === "hidden",
  });
  if (response.ok) {
    const data: { revision: string; updatedAt: number } = await response.json();
    return { ok: true, revision: data.revision, updatedAt: data.updatedAt };
  }
  let error: SaveError = "draft.saveError";
  if (response.status === 409) error = "draft.conflict";
  else if (response.status === 401) error = "draft.session";
  else if (response.status === 403) {
    const body = await response.json().catch(() => null);
    error =
      isRecord(body) && body.error === "deadlinePassed" ? "draft.deadlinePassed" : "draft.session";
  } else if (response.status === 413) error = "draft.tooLarge";
  else if (response.status === 400) {
    const body = await response.json().catch(() => null);
    if (isRecord(body) && body.error === "repo") error = "draft.invalidRepo";
  }
  return {
    ok: false,
    error,
    retry: response.status >= 500,
    invalidContent: response.status === 400,
  };
}
