import { useState, useEffect } from "react";

import type { WorkspaceSnapshot } from "../model/personalWorkspace";
import { loadSnapshot } from "../services/workspaceApi";

interface SnapshotState {
  key: string;
  snapshot: WorkspaceSnapshot | null;
  error: boolean;
}

export function useWorkspaceSnapshot(
  projectId: string,
  accountId: string,
  forStudent = false,
  enabled = true,
) {
  const targetKey = `${projectId}/${accountId}/${forStudent}`;
  const [state, setState] = useState<SnapshotState>({
    key: targetKey,
    snapshot: null,
    error: false,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      try {
        const data = await loadSnapshot(projectId, accountId, controller.signal, forStudent);
        if (!controller.signal.aborted) {
          setState({ key: targetKey, snapshot: data, error: false });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ key: targetKey, snapshot: null, error: true });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [projectId, accountId, forStudent, enabled, targetKey, attempt]);
  const matches = enabled && state.key === targetKey;
  return {
    snapshot: matches ? state.snapshot : null,
    error: matches ? state.error : false,
    retry: () => {
      setState({ key: targetKey, snapshot: null, error: false });
      setAttempt((n) => n + 1);
    },
  };
}
