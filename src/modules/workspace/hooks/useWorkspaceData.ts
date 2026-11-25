import { useAsyncLoad } from "@shared/useAsyncLoad";

import { loadSnapshot, loadStudentWorkspaces } from "../services/workspaceApi";

export function useWorkspaceSnapshot(
  projectId: string,
  accountId: string,
  forStudent = false,
  enabled = true,
) {
  const key = JSON.stringify([projectId, accountId, forStudent]);
  const { data, error, reload } = useAsyncLoad(
    (signal) => loadSnapshot(projectId, accountId, signal, forStudent),
    { key, enabled },
  );
  return { snapshot: data, error, retry: reload };
}

export function useStudentWorkspaces(projectId: string, enabled: boolean) {
  const { data, loading, error, reload } = useAsyncLoad(
    (signal) => loadStudentWorkspaces(projectId, signal),
    { key: projectId, enabled },
  );
  return { students: data ?? [], loading, error, retry: reload };
}
