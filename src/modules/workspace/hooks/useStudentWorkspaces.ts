import { useEffect, useState } from "react";

import type { StudentWorkspaceSummary } from "../model/personalWorkspace";
import { loadStudentWorkspaces } from "../services/workspaceApi";

interface StudentListState {
  projectId: string;
  students: StudentWorkspaceSummary[];
  loading: boolean;
  error: boolean;
}

export function useStudentWorkspaces(projectId: string, enabled: boolean) {
  const [state, setState] = useState<StudentListState>({
    projectId,
    students: [],
    loading: enabled,
    error: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      try {
        const students = await loadStudentWorkspaces(projectId, controller.signal);
        if (!controller.signal.aborted) {
          setState({ projectId, students, loading: false, error: false });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ projectId, students: [], loading: false, error: true });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [projectId, enabled, attempt]);

  const matches = state.projectId === projectId;
  return {
    students: enabled && matches ? state.students : [],
    loading: enabled ? (matches ? state.loading : true) : false,
    error: enabled && matches ? state.error : false,
    retry: () => {
      setState({ projectId, students: [], loading: true, error: false });
      setAttempt((n) => n + 1);
    },
  };
}
