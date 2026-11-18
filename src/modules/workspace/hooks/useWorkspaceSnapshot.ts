import { useState, useEffect } from "react";
import type { WorkspaceSnapshot } from "../model/personalWorkspace";
import { loadSnapshot } from "../services/workspaceApi";

export function useWorkspaceSnapshot(projectId: string, accountId: string) {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await loadSnapshot(projectId, accountId, controller.signal);
        if (!controller.signal.aborted) setSnapshot(data);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [projectId, accountId, attempt]);
  return {
    snapshot,
    error,
    retry: () => {
      setError(false);
      setAttempt((n) => n + 1);
    },
  };
}
