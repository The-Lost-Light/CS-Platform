import type { User } from "@modules/auth";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { SettingsButton } from "@modules/settings";
import { Link } from "@void/react";
import { ChevronRight, Code2, FolderGit2, LogOut, ShieldCheck } from "lucide-react";

export function HomeDashboard({
  projects,
  onOpenProject,
  currentUser,
  onLogout,
}: {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  currentUser: User;
  onLogout?: () => void | Promise<void>;
}) {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      <section className="ui-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="ui-icon-badge w-11 h-11 rounded-xl">
            <Code2 aria-hidden="true" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {t("home.title")}
            </h1>
            <p className="text-sm text-on-muted mt-0.5">
              {t("home.welcome")}
              {currentUser?.name || t("home.student")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          {currentUser.role === "admin" && (
            <Link href="/admin" className="ui-btn-tonal">
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
              <span>{t("admin.mode")}</span>
            </Link>
          )}
          <SettingsButton />
          <button
            type="button"
            onClick={() => {
              void onLogout?.();
            }}
            className="ui-btn-outlined hover:bg-danger-container hover:text-on-danger-container hover:border-danger-outline/60"
            title={t("auth.signOutDescription")}
          >
            <LogOut aria-hidden="true" className="w-3.5 h-3.5" />
            <span>{t("auth.signOut")}</span>
          </button>
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
                className="w-full px-5 sm:px-6 py-5 text-left bg-transparent hover:bg-surface-hover flex items-center justify-between gap-4 group transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="ui-code-badge">{proj.codeName}</span>
                  <span className="text-base sm:text-lg font-semibold text-on-surface group-hover:text-primary truncate transition-colors">
                    {proj.title}
                  </span>
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
