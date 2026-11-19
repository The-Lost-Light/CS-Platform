import { C4Architect } from "@modules/c4-editor";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { GitHubRepoDashboard, RepositoryConnection } from "@modules/repository";
import { Compass, FileText, FolderGit2, GitBranch } from "lucide-react";

import { useProjectWorkspace } from "../hooks/useProjectWorkspace";
import type { WorkspaceSnapshot } from "../model/personalWorkspace";
import { AssignmentPanel } from "./AssignmentPanel";
import { SaveWorkspace } from "./SaveWorkspace";

export function ProjectWorkspace({
  project,
  snapshot,
}: {
  project: Project;
  snapshot: WorkspaceSnapshot;
}) {
  const { t } = useI18n();
  const { repository, draft, revision, setRevision, activeTab, setActiveTab } =
    useProjectWorkspace(snapshot);
  const {
    mindMapNodes,
    setMindMapNodes,
    relationships,
    setRelationships,
    designDoc,
    setDesignDoc,
  } = draft;

  return (
    <div className="max-w-5xl xl:max-w-360 mx-auto px-4 sm:px-6 py-6">
      <section
        className={`ui-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${activeTab === "design" ? "rounded-b-none border-b-0" : ""}`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="ui-icon-badge w-11 h-11 rounded-xl">
            <FolderGit2 aria-hidden="true" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ui-code-badge">{project.codeName}</span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-on-surface truncate">
                {project.title}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-on-muted mt-1 wrap-break-word">
              {project.summary}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2.5 lg:justify-end">
          <SaveWorkspace
            projectId={project.id}
            accountId={snapshot.accountId}
            revision={revision}
            onSaved={setRevision}
            designDoc={designDoc}
            nodes={mindMapNodes}
            relationships={relationships}
            repoUrl={repository.repoUrlInput}
          />
          <div
            role="tablist"
            aria-label={t("workspace.tabs.label")}
            className="ui-pill-group self-start sm:self-auto shrink-0"
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
        hidden={activeTab !== "design"}
      >
        <C4Architect
          key={project.id}
          relationships={relationships}
          onChangeRelationships={setRelationships}
          nodes={mindMapNodes}
          onChangeNodes={setMindMapNodes}
          designDoc={designDoc}
          onChangeDesignDoc={setDesignDoc}
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
        <GitHubRepoDashboard repoBundle={repository.repoBundle} />
      </div>
    </div>
  );
}
