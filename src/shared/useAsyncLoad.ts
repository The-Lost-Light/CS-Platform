import { useCallback, useEffect, useEffectEvent, useState } from "react";

interface LoadState<T> {
  key: string;
  data: T | null;
  loading: boolean;
  error: boolean;
}

export function useAsyncLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  options?: {
    key?: string;
    enabled?: boolean;
    preserveDataOnReload?: boolean;
  },
) {
  const key = options?.key ?? "default";
  const enabled = options?.enabled ?? true;
  const preserveDataOnReload = options?.preserveDataOnReload ?? false;
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
        if (!controller.signal.aborted) {
          setState({ key, data, loading: false, error: false });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState((prev) => ({
            key,
            data: preserveDataOnReload && prev.key === key ? prev.data : null,
            loading: false,
            error: true,
          }));
        }
      }
    }
    void refresh();
    return () => controller.abort();
  }, [key, enabled, attempt, preserveDataOnReload]);

  const matches = enabled && state.key === key;

  const reload = useCallback(() => {
    setState((prev) => ({
      key,
      data: preserveDataOnReload && prev.key === key ? prev.data : null,
      loading: true,
      error: false,
    }));
    setAttempt((n) => n + 1);
  }, [key, preserveDataOnReload]);

  const setData = useCallback(
    (updater: T | ((previous: T | null) => T | null)) => {
      setState((prev) => {
        const base = prev.key === key ? prev.data : null;
        const next =
          typeof updater === "function"
            ? (updater as (previous: T | null) => T | null)(base)
            : updater;
        return { key, data: next, loading: false, error: false };
      });
    },
    [key],
  );

  return {
    data: matches ? state.data : null,
    setData,
    loading: enabled && (!matches || state.loading),
    error: matches && state.error,
    reload,
  };
}
