import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import {
  AvatarBadge,
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  FeedbackBanner,
  LoadingPanel,
  PageContainer,
  PageHeaderCard,
} from "@shared/ui";
import { Link } from "@void/react";
import { CheckCircle2, ChevronRight, FolderGit2, Users, X } from "lucide-react";

import type { StudentWorkspaceSummary } from "../model/personalWorkspace";

export function StudentWorkspaceList({
  project,
  students,
  onSelectStudent,
  loading = false,
  error = false,
  onRetry,
}: {
  project: Project;
  students: StudentWorkspaceSummary[];
  onSelectStudent: (studentId: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  const sortedStudents = [...students].sort(
    (a, b) => Number(b.hasWorkspace) - Number(a.hasWorkspace),
  );
  const submittedCount = students.filter((student) => student.hasWorkspace).length;

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
            {!loading && !error && (
              <Chip variant="primary" mono>
                {t("workspace.studentSubmittedCount", {
                  submitted: submittedCount,
                  total: students.length,
                })}
              </Chip>
            )}
            <Link
              href="/"
              aria-label={t("common.backHome")}
              title={t("common.backHome")}
              className="ui-btn-icon w-8 h-8 shrink-0"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </Link>
          </>
        }
      />

      <Card overflowHidden>
        <CardHeader
          as="header"
          icon={Users}
          title={t("workspace.studentListTitle", { count: students.length })}
        />

        {error ? (
          <div className="p-5 sm:p-6">
            <FeedbackBanner
              kind="error"
              action={
                onRetry && (
                  <Button variant="outlined" onClick={onRetry} className="shrink-0">
                    {t("auth.retry")}
                  </Button>
                )
              }
            >
              <span>{t("workspace.studentListError")}</span>
            </FeedbackBanner>
          </div>
        ) : loading ? (
          <div className="p-5 sm:p-6">
            <LoadingPanel label={t("common.loading")} />
          </div>
        ) : sortedStudents.length > 0 ? (
          <div className="divide-y divide-outline-subtle">
            {sortedStudents.map((student) => (
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
                    <div className="font-mono text-xs text-on-muted truncate">{student.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Chip
                    variant={student.hasWorkspace ? "success" : "neutral"}
                    icon={student.hasWorkspace ? CheckCircle2 : undefined}
                  >
                    <span>
                      {t(
                        student.hasWorkspace ? "workspace.studentSaved" : "workspace.studentEmpty",
                      )}
                    </span>
                  </Chip>
                  <span className="ui-chevron-indicator">
                    <ChevronRight aria-hidden="true" className="w-4 h-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState>{t("admin.empty")}</EmptyState>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
