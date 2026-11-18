import type { PersonalWorkspace, WorkspaceSnapshot } from "../model/personalWorkspace";

export async function loadSnapshot(projectId: string, accountId: string, signal: AbortSignal) {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/workspace`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Load failed");
  const snapshot: WorkspaceSnapshot = await response.json();
  if (snapshot.accountId !== accountId) throw new Error("Session changed");
  return snapshot;
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
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/workspace`, {
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
  else if (response.status === 400 && (await response.json()).error === "repo")
    error = "draft.invalidRepo";
  return { ok: false, error, retry: response.status >= 500 };
}
