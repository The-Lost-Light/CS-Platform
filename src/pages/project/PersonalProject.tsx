import { useEffect, useState } from "react";
import type { Project } from "@domain/project";
import type { WorkspaceSnapshot } from "@domain/personalWorkspace";
import { useI18n } from "@i18n";
import { LoadingPanel } from "@pages/layout/LoadingPanel";
import { ProjectWorkspace } from "@pages/project/ProjectWorkspace";

export function PersonalProject({ project, accountId }: { project: Project; accountId: string }) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const projectId = project.id;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/workspace`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Load failed");
        const data: WorkspaceSnapshot = await response.json();
        if (data.accountId !== accountId) throw new Error("Session changed");
        if (!controller.signal.aborted) setSnapshot(data);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [projectId, accountId, attempt]);
  if (error)
    return (
      <div className="ui-card m-6 p-4" role="alert">
        {t("draft.loadError")}{" "}
        <button
          className="ui-btn-tonal"
          onClick={() => {
            setError(false);
            setAttempt((n) => n + 1);
          }}
        >
          {t("auth.retry")}
        </button>
      </div>
    );
  if (!snapshot) return <LoadingPanel />;
  return <ProjectWorkspace project={project} snapshot={snapshot} />;
}
