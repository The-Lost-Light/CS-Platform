import {
  C4Architect,
  C4FileActions,
  type DesignTab,
  DesignTabs,
  useC4ModelFile,
} from "@modules/c4-editor";
import { useI18n } from "@modules/i18n";
import {
  formatTaipeiDateTime,
  isWorkspaceLate,
  toTaipeiIsoString,
  type Project,
} from "@modules/projects";
import { GitHubRepoDashboard, RepositoryConnection } from "@modules/repository";
import {
  Chip,
  Button,
  FeedbackBanner,
  IconButton,
  IconLink,
  PageContainer,
  PageHeaderCard,
  SegmentedControl,
  cn,
} from "@shared/ui";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  FileText,
  FolderGit2,
  GitBranch,
  History,
  Lock,
  X,
} from "lucide-react";
import { useState } from "react";

import { useProjectWorkspace, type WorkspaceTab } from "../hooks/useProjectWorkspace";
import { useWorkspaceAutosave } from "../hooks/useWorkspaceAutosave";
import type { WorkspaceSnapshot } from "../model/personalWorkspace";
import { AssignmentPanel } from "./AssignmentPanel";
import { DesignHistory } from "./DesignHistory";
import { SaveWorkspace } from "./SaveWorkspace";

const toolbarRowClass = "mt-4 -mx-5 sm:-mx-6 border-t border-outline-subtle px-5 sm:px-6 pt-4";

export interface StudentNavigation {
  currentIndex: number;
  total: number;
  previousName?: string;
  nextName?: string;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function ProjectWorkspace({
  project,
  snapshot,
  initialActiveTab,
  initialDesignTab,
  readOnly = false,
  deadlineLocked = false,
  onDeadlineLocked,
  onWorkspaceSaved,
  studentName,
  studentNavigation,
  closeHref,
  onClose,
  onActiveTabChange,
  onDesignTabChange,
  now,
}: {
  project: Project;
  snapshot: WorkspaceSnapshot;
  initialActiveTab?: WorkspaceTab;
  initialDesignTab?: DesignTab;
  readOnly?: boolean;
  deadlineLocked?: boolean;
  onDeadlineLocked?: () => void;
  onWorkspaceSaved?: (projectId: string, updatedAt: number) => void;
  studentName?: string;
  studentNavigation?: StudentNavigation;
  closeHref?: string;
  onClose?: () => void;
  onActiveTabChange?: (tab: WorkspaceTab) => void;
  onDesignTabChange?: (tab: DesignTab) => void;
  now?: number;
}) {
  const { t } = useI18n();
  const [lastSavedAt, setLastSavedAt] = useState(snapshot.updatedAt);
  const effectiveReadOnly = readOnly || deadlineLocked;
  const [showHistory, setShowHistory] = useState(false);
  const autosave = useWorkspaceAutosave(
    project.id,
    snapshot,
    !effectiveReadOnly,
    (_, time) => {
      setLastSavedAt(time);
      onWorkspaceSaved?.(project.id, time);
    },
    onDeadlineLocked,
  );
  const { repository, draft, activeTab, setActiveTab, designTab, setDesignTab } =
    useProjectWorkspace(snapshot, undefined, initialActiveTab, initialDesignTab, autosave.update);
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
  const lateSaved = lastSavedAt !== null && isWorkspaceLate(project.dueDate, lastSavedAt);

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
              <>
                <Chip variant="secondary" icon={Eye} className="shrink-0">
                  <span>
                    {studentName
                      ? t("workspace.viewingStudent", { name: studentName })
                      : t("workspace.readOnlyBadge")}
                  </span>
                </Chip>
                {lastSavedAt !== null && (
                  <Chip
                    variant={lateSaved ? "danger" : "neutral"}
                    icon={lateSaved ? AlertCircle : Clock}
                    className="shrink-0"
                  >
                    <time dateTime={toTaipeiIsoString(lastSavedAt)}>
                      {t(lateSaved ? "workspace.lateSavedAt" : "workspace.lastUpdatedAt", {
                        time: formatTaipeiDateTime(lastSavedAt),
                      })}
                    </time>
                  </Chip>
                )}
                {studentNavigation && studentNavigation.total > 1 && (
                  <div className="inline-flex items-center gap-1 rounded-full border border-outline-subtle bg-surface-container px-1.5 py-0.5 shrink-0">
                    <IconButton
                      icon={ChevronLeft}
                      size="sm"
                      disabled={!studentNavigation.onPrevious}
                      onClick={studentNavigation.onPrevious}
                      label={
                        studentNavigation.previousName
                          ? t("workspace.previousStudentNamed", {
                              name: studentNavigation.previousName,
                            })
                          : t("workspace.previousStudent")
                      }
                      withTitle
                    />
                    <span className="px-1.5 font-mono text-xs font-semibold text-on-muted tabular-nums">
                      {studentNavigation.currentIndex + 1} / {studentNavigation.total}
                    </span>
                    <IconButton
                      icon={ChevronRight}
                      size="sm"
                      disabled={!studentNavigation.onNext}
                      onClick={studentNavigation.onNext}
                      label={
                        studentNavigation.nextName
                          ? t("workspace.nextStudentNamed", { name: studentNavigation.nextName })
                          : t("workspace.nextStudent")
                      }
                      withTitle
                    />
                  </div>
                )}
              </>
            ) : deadlineLocked ? (
              <Chip variant="danger" icon={Lock} className="shrink-0">
                <span>{t("workspace.deadlineLockedBadge")}</span>
              </Chip>
            ) : (
              <SaveWorkspace status={autosave.status} updatedAt={lastSavedAt} />
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
            <IconLink
              href={closeHref ?? "/"}
              icon={X}
              label={backLabel}
              withTitle
              onClick={
                onClose
                  ? (event) => {
                      event.preventDefault();
                      onClose();
                    }
                  : undefined
              }
            />
          </>
        }
      >
        {activeTab === "design" && (
          <div className={cn(toolbarRowClass, "flex flex-wrap items-center justify-between gap-3")}>
            <DesignTabs
              designTab={designTab}
              onChangeDesignTab={handleDesignTabChange}
              history={showHistory}
            />
            <div className="flex flex-wrap items-center gap-2">
              {readOnly && (
                <Button
                  icon={History}
                  variant={showHistory ? "tonal" : "outlined"}
                  aria-pressed={showHistory}
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {t("history.title")}
                </Button>
              )}
              {designTab === "diagram" && !showHistory && (
                <C4FileActions file={c4File} readOnly={effectiveReadOnly} />
              )}
            </div>
          </div>
        )}
        <div className={toolbarRowClass} hidden={activeTab !== "github"}>
          <RepositoryConnection
            repository={repository}
            readOnly={effectiveReadOnly}
            emptyReadOnlyMessage={
              deadlineLocked && !readOnly ? t("workspace.lockedNoRepo") : undefined
            }
          />
        </div>
      </PageHeaderCard>

      {!readOnly && deadlineLocked && (
        <FeedbackBanner kind="error" className="mt-4">
          {t("workspace.deadlineLockedNotice", { deadline: project.dueDate })}
          {lastSavedAt !== null &&
            ` · ${t("workspace.lastUpdatedAt", { time: formatTaipeiDateTime(lastSavedAt) })}`}
        </FeedbackBanner>
      )}

      <div
        role="tabpanel"
        id="workspace-panel-assignment"
        aria-labelledby="workspace-tab-assignment"
        className="mt-6"
        hidden={activeTab !== "assignment"}
      >
        <AssignmentPanel project={project} now={now} />
      </div>
      <div
        role="tabpanel"
        id="workspace-panel-design"
        aria-labelledby="workspace-tab-design"
        className="mt-6"
        hidden={activeTab !== "design"}
      >
        {showHistory && readOnly ? (
          <div
            role="tabpanel"
            id="design-history-panel"
            aria-labelledby={`design-tab-${designTab}`}
          >
            <DesignHistory projectId={project.id} accountId={snapshot.accountId} tab={designTab} />
          </div>
        ) : (
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
            readOnly={effectiveReadOnly}
            emptyReadOnlyMessage={
              deadlineLocked && !readOnly ? t("workspace.lockedNoReadme") : undefined
            }
          />
        )}
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
