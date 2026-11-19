import type { User } from "@modules/auth";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { ChevronRight, FolderGit2 } from "lucide-react";

export function HomeDashboard({
  projects,
  onOpenProject,
  currentUser,
}: {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  currentUser: User;
}) {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <section className="ui-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <span className="ui-chip-secondary mb-2">{t("home.dashboard")}</span>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-on-surface">
            {t("home.welcome")}
            {currentUser?.name || t("home.student")}
          </h1>
          <p className="text-sm text-on-muted mt-1">{t("home.description")}</p>
        </div>
        <div className="rounded-xl bg-surface-tonal border border-outline-tonal px-5 py-3.5 text-center min-w-28 shrink-0">
          <div className="text-2xl font-bold text-primary font-mono">{projects.length}</div>
          <div className="text-xs font-semibold text-on-primary-container/80 mt-0.5">
            {t("common.projects")}
          </div>
        </div>
      </section>

      <section className="ui-card overflow-hidden">
        <div className="ui-card-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ui-icon-badge w-9 h-9">
              <FolderGit2 aria-hidden="true" className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-on-primary-container truncate">
              {t("home.projectsTitle")}
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-surface-elevated text-primary font-mono text-xs font-bold border border-primary-outline shrink-0">
            {t("home.projectCount", { count: projects.length })}
          </span>
        </div>

        {projects.length > 0 ? (
          <div className="divide-y divide-outline-subtle">
            {projects.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => onOpenProject(proj)}
                className="w-full px-5 sm:px-6 py-4.5 text-left bg-transparent hover:bg-surface-hover flex items-center justify-between gap-4 group transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="ui-code-badge">{proj.codeName}</span>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-on-surface group-hover:text-primary truncate transition-colors">
                      {proj.title}
                    </div>
                    {proj.summary && (
                      <p className="text-xs text-on-muted truncate mt-0.5">{proj.summary}</p>
                    )}
                  </div>
                </div>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-on-subtle group-hover:bg-primary-container group-hover:text-on-primary-container transition-all shrink-0">
                  <ChevronRight
                    aria-hidden="true"
                    className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                  />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <p className="ui-empty">{t("admin.empty")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
