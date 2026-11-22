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
import { Chip, PageContainer, PageHeaderCard, SegmentedControl, cn } from "@shared/ui";
import { Link } from "@void/react";
import { Compass, Eye, FileText, FolderGit2, GitBranch, X } from "lucide-react";

import { useProjectWorkspace, type WorkspaceTab } from "../hooks/useProjectWorkspace";
import type { WorkspaceSnapshot } from "../model/personalWorkspace";
import { AssignmentPanel } from "./AssignmentPanel";
import { SaveWorkspace } from "./SaveWorkspace";

const toolbarRowClass = "mt-4 -mx-5 sm:-mx-6 border-t border-outline-subtle px-5 sm:px-6 pt-4";

export function ProjectWorkspace({
  project,
  snapshot,
  initialActiveTab,
  initialDesignTab,
  readOnly = false,
  studentName,
  closeHref,
  onClose,
  onActiveTabChange,
  onDesignTabChange,
}: {
  project: Project;
  snapshot: WorkspaceSnapshot;
  initialActiveTab?: WorkspaceTab;
  initialDesignTab?: DesignTab;
  readOnly?: boolean;
  studentName?: string;
  closeHref?: string;
  onClose?: () => void;
  onActiveTabChange?: (tab: WorkspaceTab) => void;
  onDesignTabChange?: (tab: DesignTab) => void;
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
  function handleActiveTabChange(tab: WorkspaceTab) {
    setActiveTab(tab);
    onActiveTabChange?.(tab);
  }
  function handleDesignTabChange(tab: DesignTab) {
    setDesignTab(tab);
    onDesignTabChange?.(tab);
  }
  const c4File = useC4ModelFile({
    nodes: history.present.nodes,
    relationships: history.present.relationships,
    dispatchModel,
    onChangeDesignTab: handleDesignTabChange,
  });

  const backLabel = t(onClose || closeHref ? "workspace.backToStudentList" : "common.backHome");

  return (
    <PageContainer variant="workspace">
      <PageHeaderCard
        compact
        icon={FolderGit2}
        title={project.title}
        titleAttr={project.title}
        className="relative z-10"
        actionsClassName="max-w-full self-start lg:self-auto"
        actions={
          <>
            {readOnly ? (
              <Chip variant="secondary" icon={Eye} className="shrink-0">
                <span>
                  {studentName
                    ? t("workspace.viewingStudent", { name: studentName })
                    : t("workspace.readOnlyBadge")}
                </span>
              </Chip>
            ) : (
              <SaveWorkspace
                projectId={project.id}
                accountId={snapshot.accountId}
                revision={revision}
                onSaved={setRevision}
                designDoc={designDoc}
                nodes={history.present.nodes}
                relationships={history.present.relationships}
                repoUrl={repository.repoUrl}
              />
            )}
            <SegmentedControl
              role="tablist"
              ariaLabel={t("workspace.tabs.label")}
              value={activeTab}
              onChange={handleActiveTabChange}
              className="shrink-0"
              options={[
                {
                  value: "assignment",
                  label: t("workspace.tabs.assignment"),
                  icon: FileText,
                  id: "workspace-tab-assignment",
                  ariaControls: "workspace-panel-assignment",
                },
                {
                  value: "design",
                  label: t("workspace.tabs.design"),
                  icon: Compass,
                  id: "workspace-tab-design",
                  ariaControls: "workspace-panel-design",
                },
                {
                  value: "github",
                  label: t("workspace.tabs.github"),
                  icon: GitBranch,
                  id: "workspace-tab-github",
                  ariaControls: "workspace-panel-github",
                },
              ]}
            />
            <Link
              href={closeHref ?? "/"}
              onClick={
                onClose
                  ? (event) => {
                      event.preventDefault();
                      onClose();
                    }
                  : undefined
              }
              aria-label={backLabel}
              title={backLabel}
              className="ui-btn-icon w-8 h-8 shrink-0"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </Link>
          </>
        }
      >
        {activeTab === "design" && (
          <div className={cn(toolbarRowClass, "flex flex-wrap items-center justify-between gap-3")}>
            <DesignTabs designTab={designTab} onChangeDesignTab={handleDesignTabChange} />
            {designTab === "diagram" && <C4FileActions file={c4File} readOnly={readOnly} />}
          </div>
        )}
        <div className={toolbarRowClass} hidden={activeTab !== "github"}>
          <RepositoryConnection repository={repository} readOnly={readOnly} />
        </div>
      </PageHeaderCard>

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
          onChangeDesignTab={handleDesignTabChange}
          importing={c4File.importing}
          importRevision={c4File.importRevision}
          readOnly={readOnly}
        />
      </div>
      <div
        role="tabpanel"
        id="workspace-panel-github"
        aria-labelledby="workspace-tab-github"
        className="mt-6"
        hidden={activeTab !== "github"}
      >
        <GitHubRepoDashboard
          repoBundle={repository.repoBundle}
          onBranchChange={repository.handleBranchChange}
          isLoading={repository.isLoadingRepo}
        />
      </div>
    </PageContainer>
  );
}
