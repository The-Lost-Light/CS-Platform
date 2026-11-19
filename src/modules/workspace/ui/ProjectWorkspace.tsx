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
            <p className="text-xs text-on-muted mt-1 wrap-break-word">{project.summary}</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
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
            className="ui-pill-group gap-1 self-start sm:self-auto shrink-0"
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
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeTab === tab
                    ? tab === "design"
                      ? "bg-primary text-on-primary shadow-2xs"
                      : "bg-secondary text-on-secondary shadow-2xs"
                    : "text-on-muted hover:bg-surface-hover hover:text-on-surface"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
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
