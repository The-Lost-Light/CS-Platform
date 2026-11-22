import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { Link } from "@void/react";
import { AlertCircle, CheckCircle2, ChevronRight, FolderGit2, Users, X } from "lucide-react";

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      <section className="ui-card px-5 sm:px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="ui-icon-badge w-11 h-11 rounded-xl">
            <FolderGit2 aria-hidden="true" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1
              title={project.title}
              className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface truncate"
            >
              {project.title}
            </h1>
            <p className="text-xs sm:text-sm text-on-muted mt-0.5">
              {t("home.viewStudentProjects")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {!loading && !error && (
            <span className="ui-chip-primary font-mono">
              {t("workspace.studentSubmittedCount", {
                submitted: submittedCount,
                total: students.length,
              })}
            </span>
          )}
          <Link
            href="/"
            aria-label={t("common.backHome")}
            title={t("common.backHome")}
            className="ui-btn-icon w-8 h-8 shrink-0"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section className="ui-card overflow-hidden">
        <header className="ui-card-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ui-icon-badge w-9 h-9">
              <Users aria-hidden="true" className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-on-primary-container truncate">
              {t("workspace.studentListTitle", { count: students.length })}
            </h2>
          </div>
        </header>

        {error ? (
          <div className="p-5 sm:p-6">
            <div role="alert" className="ui-banner-danger">
              <div className="flex items-center gap-2">
                <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>{t("workspace.studentListError")}</span>
              </div>
              {onRetry && (
                <button type="button" onClick={onRetry} className="ui-btn-outlined shrink-0">
                  {t("auth.retry")}
                </button>
              )}
            </div>
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
                className="w-full px-5 sm:px-6 py-4 text-left bg-transparent hover:bg-surface-hover flex items-center justify-between gap-4 group transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container text-xs font-bold inline-flex items-center justify-center shrink-0">
                    {student.name?.slice(0, 1) || "?"}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-on-surface group-hover:text-primary truncate transition-colors">
                      {student.name}
                    </div>
                    <div className="font-mono text-xs text-on-muted truncate">{student.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={student.hasWorkspace ? "ui-chip-success" : "ui-chip-neutral"}>
                    {student.hasWorkspace && (
                      <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {t(
                        student.hasWorkspace ? "workspace.studentSaved" : "workspace.studentEmpty",
                      )}
                    </span>
                  </span>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-on-subtle group-hover:bg-primary-container group-hover:text-on-primary-container transition-all shrink-0">
                    <ChevronRight aria-hidden="true" className="w-4 h-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <p className="ui-empty">{t("admin.empty")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
