import {
  C4Architect,
  C4FileActions,
  type DesignTab,
  DesignTabs,
  useC4ModelFile,
} from "@modules/c4-editor";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { GitHubRepoDashboard, RepositoryConnection } from "@modules/repository";
import { Compass, FileText, FolderGit2, GitBranch } from "lucide-react";

import { useProjectWorkspace, type WorkspaceTab } from "../hooks/useProjectWorkspace";
import type { WorkspaceSnapshot } from "../model/personalWorkspace";
import { AssignmentPanel } from "./AssignmentPanel";
import { SaveWorkspace } from "./SaveWorkspace";

export function ProjectWorkspace({
  project,
  snapshot,
  initialActiveTab,
  initialDesignTab,
}: {
  project: Project;
  snapshot: WorkspaceSnapshot;
  initialActiveTab?: WorkspaceTab;
  initialDesignTab?: DesignTab;
}) {
  const { t } = useI18n();
  const {
    repository,
    draft,
    revision,
    setRevision,
    activeTab,
    setActiveTab,
    designTab,
    setDesignTab,
  } = useProjectWorkspace(snapshot, undefined, initialActiveTab, initialDesignTab);
  const { history, dispatchModel, designDoc, setDesignDoc } = draft;
  const c4File = useC4ModelFile({
    nodes: history.present.nodes,
    relationships: history.present.relationships,
    dispatchModel,
    onChangeDesignTab: setDesignTab,
  });

  return (
    <div className="max-w-5xl xl:max-w-360 mx-auto px-4 sm:px-6 py-6">
      <section className="ui-card relative z-10 px-5 sm:px-6 py-4">
        <div className="space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge w-9.5 h-9.5 rounded-xl">
                <FolderGit2 aria-hidden="true" className="w-4.5 h-4.5" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="ui-code-badge">{project.codeName}</span>
                <h1
                  title={project.title}
                  className="text-lg sm:text-xl font-bold tracking-tight text-on-surface truncate min-w-0"
                >
                  {project.title}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 max-w-full flex-wrap items-center gap-2.5 self-start lg:self-auto">
              <SaveWorkspace
                projectId={project.id}
                accountId={snapshot.accountId}
                revision={revision}
                onSaved={setRevision}
                designDoc={designDoc}
                nodes={history.present.nodes}
                relationships={history.present.relationships}
                repoUrl={repository.repoUrlInput}
              />
              <div
                role="tablist"
                aria-label={t("workspace.tabs.label")}
                className="ui-pill-group shrink-0"
              >
                {(
                  [
                    ["assignment", FileText],
                    ["design", Compass],
                    ["github", GitBranch],
                  ] as const
                ).map(([tab, Icon]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    id={`workspace-tab-${tab}`}
                    aria-controls={`workspace-panel-${tab}`}
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={`ui-pill-item px-3 sm:px-4 ${
                      activeTab === tab ? "ui-pill-item-active" : "ui-pill-item-idle"
                    }`}
                  >
                    <Icon aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>{t(`workspace.tabs.${tab}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {project.summary && (
            <p className="text-xs sm:text-sm text-on-muted wrap-break-word">{project.summary}</p>
          )}
        </div>

        {activeTab === "design" && (
          <div className="mt-4 -mx-5 sm:-mx-6 border-t border-outline-subtle px-5 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-3">
            <DesignTabs designTab={designTab} onChangeDesignTab={setDesignTab} />
            {designTab === "diagram" && <C4FileActions file={c4File} />}
          </div>
        )}
      </section>

      <div
        role="tabpanel"
        id="workspace-panel-assignment"
        aria-labelledby="workspace-tab-assignment"
        className="mt-6"
        hidden={activeTab !== "assignment"}
      >
        <AssignmentPanel project={project} />
      </div>
      <div
        role="tabpanel"
        id="workspace-panel-design"
        aria-labelledby="workspace-tab-design"
        className="mt-6"
        hidden={activeTab !== "design"}
      >
        <C4Architect
          key={project.id}
          history={history}
          dispatchModel={dispatchModel}
          designDoc={designDoc}
          onChangeDesignDoc={setDesignDoc}
          designTab={designTab}
          onChangeDesignTab={setDesignTab}
          importing={c4File.importing}
          importRevision={c4File.importRevision}
        />
      </div>
      <div
        role="tabpanel"
        id="workspace-panel-github"
        aria-labelledby="workspace-tab-github"
        className="mt-6 space-y-6"
        hidden={activeTab !== "github"}
      >
        <RepositoryConnection repository={repository} />
        <GitHubRepoDashboard
          repoBundle={repository.repoBundle}
          onBranchChange={repository.handleBranchChange}
          isLoading={repository.isLoadingRepo}
        />
      </div>
    </div>
  );
}
