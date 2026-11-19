import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { LoadingPanel } from "@shared/ui/LoadingPanel";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";
import { ProjectWorkspace } from "./ProjectWorkspace";

export function PersonalProject({ project, accountId }: { project: Project; accountId: string }) {
  const { t } = useI18n();
  const { snapshot, error, retry } = useWorkspaceSnapshot(project.id, accountId);
  if (error)
    return (
      <div className="ui-card m-6 p-4" role="alert">
        {t("draft.loadError")}{" "}
        <button className="ui-btn-tonal" onClick={retry}>
          {t("auth.retry")}
        </button>
      </div>
    );
  if (!snapshot) return <LoadingPanel label={t("common.loading")} />;
  return <ProjectWorkspace project={project} snapshot={snapshot} />;
}
