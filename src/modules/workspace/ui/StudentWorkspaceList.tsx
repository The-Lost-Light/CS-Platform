import { useI18n } from "@modules/i18n";
import {
  formatTaipeiDateTime,
  isProjectOverdue,
  isWorkspaceLate,
  toTaipeiIsoString,
  type Project,
} from "@modules/projects";
import {
  AvatarBadge,
  Card,
  CardHeader,
  CardList,
  ChevronIndicator,
  Chip,
  FeedbackBanner,
  IconLink,
  LoadingPanel,
  PageContainer,
  PageHeaderCard,
  SegmentedControl,
  TextInput,
} from "@shared/ui";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  FolderGit2,
  Search,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import type { StudentWorkspaceSummary } from "../model/personalWorkspace";
import {
  filterStudentWorkspaces,
  isStudentOverdue,
  sortStudentWorkspaces,
  type StudentStatusFilter,
} from "../model/studentList";

export function StudentWorkspaceList({
  project,
  students,
  onSelectStudent,
  loading = false,
  error = false,
  onRetry,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  now,
}: {
  project: Project;
  students: StudentWorkspaceSummary[];
  onSelectStudent: (studentId: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: StudentStatusFilter;
  onStatusFilterChange?: (value: StudentStatusFilter) => void;
  now?: number;
}) {
  const { t } = useI18n();
  const [defaultNow] = useState(() => Date.now());
  const currentNow = now ?? defaultNow;
  const [localSearch, setLocalSearch] = useState("");
  const [localFilter, setLocalFilter] = useState<StudentStatusFilter>("all");
  const activeSearch = search ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const activeFilter = statusFilter ?? localFilter;
  const setStatusFilter = onStatusFilterChange ?? setLocalFilter;

  const overdue = isProjectOverdue(project.dueDate, currentNow);
  const sortedStudents = sortStudentWorkspaces(students);
  const submittedCount = students.filter((student) => student.hasWorkspace).length;
  const emptyCount = students.length - submittedCount;
  const lateCount = students.filter((student) =>
    isStudentOverdue(student, project.dueDate, currentNow),
  ).length;
  const visibleStudents = filterStudentWorkspaces(sortedStudents, {
    search: activeSearch,
    status: activeFilter,
    dueDate: project.dueDate,
    now: currentNow,
  });

  const filterOptions = [
    { value: "all" as const, label: t("workspace.filter.all", { count: students.length }) },
    {
      value: "submitted" as const,
      label: t("workspace.filter.submitted", { count: submittedCount }),
    },
    { value: "empty" as const, label: t("workspace.filter.empty", { count: emptyCount }) },
    ...(project.dueDate
      ? [{ value: "late" as const, label: t("workspace.filter.late", { count: lateCount }) }]
      : []),
  ];

  return (
    <PageContainer>
      <PageHeaderCard
        compact
        icon={FolderGit2}
        title={project.title}
        titleAttr={project.title}
        description={t("home.viewStudentProjects")}
        actions={
          <>
            {project.dueDate && (
              <Chip variant={overdue ? "danger" : "outline"} icon={CalendarClock}>
                <span>
                  {project.dueDate} (UTC+8)
                  {overdue ? ` · ${t("project.overdue")}` : ""}
                </span>
              </Chip>
            )}
            <IconLink href="/" icon={X} label={t("common.backHome")} withTitle />
          </>
        }
      />

      <Card overflowHidden>
        <CardHeader
          as="header"
          icon={Users}
          title={t("workspace.studentListTitle", { count: students.length })}
          actions={
            !loading &&
            !error && (
              <Chip variant="primary" mono>
                {t("workspace.studentSubmittedCount", {
                  submitted: submittedCount,
                  total: students.length,
                })}
              </Chip>
            )
          }
        />

        {error ? (
          <div className="p-5 sm:p-6">
            <FeedbackBanner kind="error" onRetry={onRetry} retryLabel={t("auth.retry")}>
              {t("workspace.studentListError")}
            </FeedbackBanner>
          </div>
        ) : loading ? (
          <div className="p-5 sm:p-6">
            <LoadingPanel label={t("common.loading")} />
          </div>
        ) : (
          <>
            <div className="p-5 sm:p-6 border-b border-outline-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <TextInput
                icon={Search}
                type="search"
                compact
                aria-label={t("workspace.studentSearch")}
                placeholder={t("workspace.studentSearchPlaceholder")}
                wrapperClassName="flex-1 min-w-0"
                value={activeSearch}
                onChange={(event) => setSearch(event.target.value)}
              />
              <SegmentedControl
                size="sm"
                ariaLabel={t("workspace.studentFilterLabel")}
                value={activeFilter}
                onChange={setStatusFilter}
                options={filterOptions}
                className="flex-wrap rounded-2xl sm:rounded-full self-start lg:self-auto"
              />
            </div>

            <CardList isEmpty={visibleStudents.length === 0} emptyMessage={t("admin.empty")}>
              {visibleStudents.map((student) => {
                const lateSave =
                  student.hasWorkspace && isWorkspaceLate(project.dueDate, student.updatedAt);
                const missingOverdue = !student.hasWorkspace && overdue;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => onSelectStudent(student.id)}
                    className="ui-list-row group w-full text-left bg-transparent gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarBadge name={student.name} size="md" />
                      <div className="min-w-0">
                        <div className="font-semibold text-on-surface group-hover:text-primary truncate transition-colors">
                          {student.name}
                        </div>
                        <div className="font-mono text-xs text-on-muted truncate">
                          {student.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                      {student.hasWorkspace && student.updatedAt !== null && (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-on-muted">
                          <Clock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                          <time dateTime={toTaipeiIsoString(student.updatedAt)}>
                            {formatTaipeiDateTime(student.updatedAt)}
                          </time>
                        </span>
                      )}
                      <Chip
                        variant={student.hasWorkspace ? "success" : "neutral"}
                        icon={student.hasWorkspace ? CheckCircle2 : undefined}
                      >
                        <span>
                          {t(
                            student.hasWorkspace
                              ? "workspace.studentSaved"
                              : "workspace.studentEmpty",
                          )}
                        </span>
                      </Chip>
                      {lateSave && (
                        <Chip variant="danger" size="sm" icon={AlertCircle}>
                          <span>{t("workspace.studentLate")}</span>
                        </Chip>
                      )}
                      {missingOverdue && (
                        <Chip variant="danger" size="sm" icon={AlertCircle}>
                          <span>{t("project.overdue")}</span>
                        </Chip>
                      )}
                      <ChevronIndicator />
                    </div>
                  </button>
                );
              })}
            </CardList>
          </>
        )}
      </Card>
    </PageContainer>
  );
}
