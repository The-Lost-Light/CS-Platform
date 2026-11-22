import { useState, useEffect, useEffectEvent } from "react";

import { loadSnapshot, loadStudentWorkspaces } from "../services/workspaceApi";

interface LoadState<T> {
  key: string;
  data: T | null;
  loading: boolean;
  error: boolean;
}

function useWorkspaceLoad<T>(
  key: string,
  enabled: boolean,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const read = useEffectEvent(load);
  const [state, setState] = useState<LoadState<T>>({
    key,
    data: null,
    loading: enabled,
    error: false,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const data = await read(controller.signal);
        if (!controller.signal.aborted) setState({ key, data, loading: false, error: false });
      } catch {
        if (!controller.signal.aborted) setState({ key, data: null, loading: false, error: true });
      }
    }
    void refresh();
    return () => controller.abort();
  }, [key, enabled, attempt]);
  const matches = enabled && state.key === key;
  return {
    data: matches ? state.data : null,
    loading: enabled && (!matches || state.loading),
    error: matches && state.error,
    retry: () => {
      setState({ key, data: null, loading: true, error: false });
      setAttempt((n) => n + 1);
    },
  };
}

export function useWorkspaceSnapshot(
  projectId: string,
  accountId: string,
  forStudent = false,
  enabled = true,
) {
  const key = JSON.stringify([projectId, accountId, forStudent]);
  const { data, error, retry } = useWorkspaceLoad(key, enabled, (signal) =>
    loadSnapshot(projectId, accountId, signal, forStudent),
  );
  return { snapshot: data, error, retry };
}

export function useStudentWorkspaces(projectId: string, enabled: boolean) {
  const { data, loading, error, retry } = useWorkspaceLoad(projectId, enabled, (signal) =>
    loadStudentWorkspaces(projectId, signal),
  );
  return { students: data ?? [], loading, error, retry };
}
