import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { AlertCircle } from "lucide-react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";
import { ProjectWorkspace } from "./ProjectWorkspace";

export function PersonalProject({ project, accountId }: { project: Project; accountId: string }) {
  const { t } = useI18n();
  const { snapshot, error, retry } = useWorkspaceSnapshot(project.id, accountId);
  if (error)
    return (
      <div className="w-[80%] mx-auto py-4">
        <div className="ui-card p-6">
          <div className="ui-banner-danger" role="alert">
            <div className="flex items-center gap-2.5">
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
              <span>{t("draft.loadError")}</span>
            </div>
            <button type="button" className="ui-btn-outlined shrink-0" onClick={retry}>
              {t("auth.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  if (!snapshot) return <LoadingPanel label={t("common.loading")} />;
  return <ProjectWorkspace project={project} snapshot={snapshot} />;
}
