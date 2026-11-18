import type { Project } from "@domain/project";
import { useProjectWorkspace } from "@hooks/useProjectWorkspace";
import { useI18n } from "@i18n";
import { C4Architect } from "@pages/project/C4Architect";
import { RepositoryConnection } from "@pages/project/github/RepositoryConnection";
import { GitHubRepoDashboard } from "@pages/project/GitHubRepoDashboard";
import { Compass, FolderGit2, GitBranch } from "lucide-react";
import type { WorkspaceSnapshot } from "@domain/personalWorkspace";
import { SaveWorkspace } from "@pages/project/SaveWorkspace";

export function ProjectWorkspace({
  project,
  snapshot,
}: {
  project: Project;
  snapshot: WorkspaceSnapshot;
}) {
  const { t } = useI18n();
  const workspace = useProjectWorkspace(project, snapshot);
  const {
    mindMapNodes,
    setMindMapNodes,
    relationships,
    setRelationships,
    designDoc,
    setDesignDoc,
    repoBundle,
    activeTab,
    setActiveTab,
  } = workspace;

  return (
    <div className="max-w-5xl xl:max-w-360 mx-auto px-4 sm:px-6 py-6">
      {/* Material Design 3 Project Overview & Segmented View Switcher Banner */}
      <section
        className={`ui-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${activeTab === "design" ? "rounded-b-none border-b-0" : ""}`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-2xs shrink-0">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-primary-container text-on-primary-container font-mono text-xs font-bold">
                {project.codeName}
              </span>
              <h1 className="text-base sm:text-xl font-bold text-on-surface truncate">
                {project.title}
              </h1>
            </div>
            <p className="text-xs text-on-muted mt-1 line-clamp-1">{project.summary}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          <SaveWorkspace
            projectId={project.id}
            accountId={snapshot.accountId}
            revision={workspace.revision}
            onSaved={workspace.setRevision}
            designDoc={designDoc}
            nodes={mindMapNodes}
            relationships={relationships}
            repoUrl={workspace.repoUrlInput}
          />
          <div
            role="tablist"
            aria-label={t("workspace.tabs.design")}
            className="ui-pill-group gap-1 self-start sm:self-auto shrink-0"
          >
            {(["design", "github"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`workspace-tab-${tab}`}
                aria-controls={`workspace-panel-${tab}`}
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeTab === tab
                    ? tab === "design"
                      ? "bg-primary text-on-primary shadow-2xs"
                      : "bg-secondary text-on-secondary shadow-2xs"
                    : "text-on-muted hover:bg-surface-hover hover:text-on-surface"
                }`}
              >
                {tab === "design" ? (
                  <Compass className="w-3.5 h-3.5" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5" />
                )}
                <span>
                  {t(tab === "design" ? "workspace.tabs.design" : "workspace.tabs.github")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Step 1: Mind Map & Written Architecture Design */}
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

      {/* Step 2: GitHub Repository Explorer */}
      <div
        role="tabpanel"
        id="workspace-panel-github"
        aria-labelledby="workspace-tab-github"
        className="mt-6 space-y-6"
        hidden={activeTab !== "github"}
      >
        <RepositoryConnection repository={workspace} />
        <GitHubRepoDashboard repoBundle={repoBundle} />
      </div>
    </div>
  );
}
