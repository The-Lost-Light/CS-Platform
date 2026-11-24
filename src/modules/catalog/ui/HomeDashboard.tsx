import type { User } from "@modules/auth";
import { useI18n } from "@modules/i18n";
import {
  formatTaipeiDateTime,
  getDeadlineState,
  isWorkspaceLate,
  type Project,
  type ProjectWorkspaceStatus,
} from "@modules/projects";
import { SettingsButton } from "@modules/settings";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  PageContainer,
  PageHeaderCard,
} from "@shared/ui";
import { Link } from "@void/react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
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
              <Link href="/admin" className="ui-btn-tonal">
                <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{t("admin.mode")}</span>
              </Link>
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

        {projects.length > 0 ? (
          <div className="divide-y divide-outline-subtle">
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
                              <time dateTime={proj.dueDate.replace(" ", "T") + ":00+08:00"}>
                                {proj.dueDate} (UTC+8)
                              </time>
                            ) : (
                              t("project.noDeadline")
                            )}
                          </span>
                          {deadlineState === "overdue" && (
                            <Chip variant="danger" size="sm" icon={AlertCircle}>
                              <span>{t("project.overdue")}</span>
                            </Chip>
                          )}
                          {deadlineState === "dueSoon" && (
                            <Chip variant="warning" size="sm" icon={Clock}>
                              <span>{t("project.dueSoon")}</span>
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
                      <Link
                        href={`/projects/${encodeURIComponent(proj.id)}?students=1`}
                        onClick={(event) => {
                          if (onOpenStudentProjects) {
                            event.preventDefault();
                            onOpenStudentProjects(proj);
                          }
                        }}
                        className="ui-btn-tonal px-3.5 py-2 shrink-0"
                      >
                        <Users aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>{t("home.viewStudentProjects")}</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      aria-label={proj.title}
                      onClick={() => onOpenProject(proj)}
                      className="ui-chevron-indicator cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <ChevronRight aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState>{t("admin.empty")}</EmptyState>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
