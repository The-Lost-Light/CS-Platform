import type { User } from "@modules/auth";
import { useI18n } from "@modules/i18n";
import {
  formatTaipeiDateTime,
  getDeadlineState,
  isWorkspaceLate,
  toDueDateIsoString,
  type Project,
  type ProjectWorkspaceStatus,
} from "@modules/projects";
import { SettingsButton } from "@modules/settings";
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  CardList,
  ChevronIndicator,
  Chip,
  PageContainer,
  PageHeaderCard,
} from "@shared/ui";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Code2,
  FolderGit2,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";

export function HomeDashboard({
  projects,
  workspaceStatuses,
  onOpenProject,
  onOpenStudentProjects,
  currentUser,
  onLogout,
  now,
}: {
  projects: Project[];
  workspaceStatuses?: Record<string, ProjectWorkspaceStatus>;
  onOpenProject: (project: Project) => void;
  onOpenStudentProjects?: (project: Project) => void;
  currentUser: User;
  onLogout?: () => void | Promise<void>;
  now?: number;
}) {
  const { t } = useI18n();
  const [defaultNow] = useState(() => Date.now());
  const currentNow = now ?? defaultNow;
  const isAdmin = currentUser.role === "admin";

  return (
    <PageContainer>
      <PageHeaderCard
        icon={Code2}
        title={t("home.title")}
        description={
          <>
            {t("home.welcome")}
            {currentUser?.name || t("home.student")}
          </>
        }
        actionsClassName="self-start sm:self-auto"
        actions={
          <>
            {isAdmin && (
              <ButtonLink
                href="/admin"
                variant="tonal"
                icon={ShieldCheck}
                iconClassName="w-3.5 h-3.5"
              >
                <span>{t("admin.mode")}</span>
              </ButtonLink>
            )}
            <SettingsButton />
            <Button
              variant="outlined"
              icon={LogOut}
              iconClassName="w-3.5 h-3.5"
              onClick={() => {
                void onLogout?.();
              }}
              className="hover:bg-danger-container hover:text-on-danger-container hover:border-danger-outline/60"
              title={t("auth.signOutDescription")}
            >
              <span>{t("auth.signOut")}</span>
            </Button>
          </>
        }
      />

      <Card overflowHidden>
        <CardHeader
          icon={FolderGit2}
          title={t("home.projectsTitle")}
          actions={
            <Chip variant="outline" mono>
              {t("home.projectCount", { count: projects.length })}
            </Chip>
          }
        />

        <CardList isEmpty={projects.length === 0} emptyMessage={t("admin.empty")}>
          {projects.map((proj) => {
            const status = workspaceStatuses?.[proj.id];
            const deadlineState = getDeadlineState(proj.dueDate, currentNow);
            const lateSaved = Boolean(
              status?.hasWorkspace && isWorkspaceLate(proj.dueDate, status.updatedAt),
            );

            return (
              <div key={proj.id} className="ui-list-row group">
                <button
                  type="button"
                  onClick={() => onOpenProject(proj)}
                  className="flex-1 min-w-0 py-1 text-left bg-transparent flex items-center gap-3.5 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-base sm:text-lg font-semibold text-on-surface group-hover:text-primary truncate transition-colors">
                        {proj.title}
                      </span>
                      {!isAdmin &&
                        (status?.hasWorkspace ? (
                          <>
                            <Chip variant="success" size="sm" icon={CheckCircle2}>
                              <span>{t("home.statusSaved")}</span>
                            </Chip>
                            {lateSaved && (
                              <Chip variant="danger" size="sm" icon={AlertCircle}>
                                <span>{t("workspace.studentLate")}</span>
                              </Chip>
                            )}
                          </>
                        ) : (
                          <Chip variant="neutral" size="sm">
                            <span>{t("home.statusNotStarted")}</span>
                          </Chip>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-muted">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <CalendarClock
                          aria-hidden="true"
                          className="w-3.5 h-3.5 text-secondary shrink-0"
                        />
                        <span className="font-semibold">{t("project.deadline")}</span>
                        <span>
                          {proj.dueDate ? (
                            <time dateTime={toDueDateIsoString(proj.dueDate)}>
                              {proj.dueDate} (UTC+8)
                            </time>
                          ) : (
                            t("project.noDeadline")
                          )}
                        </span>
                        {(deadlineState === "overdue" || deadlineState === "dueSoon") && (
                          <Chip
                            variant={deadlineState === "overdue" ? "danger" : "warning"}
                            size="sm"
                            icon={deadlineState === "overdue" ? AlertCircle : Clock}
                          >
                            <span>
                              {t(
                                deadlineState === "overdue" ? "project.overdue" : "project.dueSoon",
                              )}
                            </span>
                          </Chip>
                        )}
                      </span>

                      {!isAdmin && status?.updatedAt && (
                        <span className="inline-flex items-center gap-1.5 font-mono">
                          <Clock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {t("home.lastSaved", {
                              time: formatTaipeiDateTime(status.updatedAt),
                            })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-2.5 shrink-0">
                  {isAdmin && (
                    <ButtonLink
                      href={`/projects/${encodeURIComponent(proj.id)}?students=1`}
                      variant="tonal"
                      icon={Users}
                      iconClassName="w-3.5 h-3.5"
                      className="px-3.5 py-2 shrink-0"
                      onClick={(event) => {
                        if (onOpenStudentProjects) {
                          event.preventDefault();
                          onOpenStudentProjects(proj);
                        }
                      }}
                    >
                      <span>{t("home.viewStudentProjects")}</span>
                    </ButtonLink>
                  )}
                  <ChevronIndicator label={proj.title} onClick={() => onOpenProject(proj)} />
                </div>
              </div>
            );
          })}
        </CardList>
      </Card>
    </PageContainer>
  );
}
