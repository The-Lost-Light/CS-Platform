import { useI18n } from '../../i18n';
import type { AdvancedProject, User } from '../../types';
import {
  FolderGit2,
  ChevronRight,
} from 'lucide-react';

export function HomeDashboard({
  projects,
  onOpenProject,
  currentUser,
}: {
  projects: AdvancedProject[];
  onOpenProject: (project: AdvancedProject) => void;
  currentUser: User;
}) {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Simple Material 3 Dashboard Overview Header */}
      <section className="ui-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold mb-1.5">
            {t('home.dashboard')}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
            {t('home.welcome')}{currentUser?.name || t('home.student')}
          </h1>
          <p className="text-xs sm:text-sm text-on-muted mt-0.5">{t('home.description')}</p>
        </div>

        <div className="ui-panel px-4 py-2.5 text-center">
          <div className="text-lg font-bold text-primary font-mono">{projects.length}</div>
          <div className="text-[11px] font-medium text-on-muted">{t('common.projects')}</div>
        </div>
      </section>

      <section className="ui-card overflow-hidden">
        <div className="ui-card-header flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-2xs">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-on-primary-container">{t('home.projectsTitle')}</h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-surface text-primary font-mono text-xs font-bold border border-primary-outline">
            {t('home.projectCount', { count: projects.length })}
          </span>
        </div>

        <div className="divide-y divide-outline">
          {projects.map((proj) => (
            <button
              key={proj.id}
              type="button"
              onClick={() => onOpenProject(proj)}
              className="w-full px-6 py-4 text-left bg-surface hover:bg-surface-hover flex items-center justify-between gap-3 group transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary-container font-mono text-xs font-bold shrink-0">
                  {proj.codeName}
                </span>
                <span className="text-sm sm:text-base font-semibold text-on-surface group-hover:text-primary truncate transition">
                  {proj.title}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-on-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
