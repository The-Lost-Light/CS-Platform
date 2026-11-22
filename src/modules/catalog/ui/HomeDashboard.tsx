import type { User } from "@modules/auth";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
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
import { ChevronRight, Code2, FolderGit2, LogOut, ShieldCheck, Users } from "lucide-react";

export function HomeDashboard({
  projects,
  onOpenProject,
  onOpenStudentProjects,
  currentUser,
  onLogout,
}: {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onOpenStudentProjects?: (project: Project) => void;
  currentUser: User;
  onLogout?: () => void | Promise<void>;
}) {
  const { t } = useI18n();

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
            {currentUser.role === "admin" && (
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
            {projects.map((proj) => (
              <div key={proj.id} className="ui-list-row group">
                <button
                  type="button"
                  onClick={() => onOpenProject(proj)}
                  className="flex-1 min-w-0 py-1 text-left bg-transparent flex items-center gap-3.5 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Chip variant="code">{proj.codeName}</Chip>
                  <span className="text-base sm:text-lg font-semibold text-on-surface group-hover:text-primary truncate transition-colors">
                    {proj.title}
                  </span>
                </button>
                <div className="flex items-center gap-2.5 shrink-0">
                  {currentUser.role === "admin" && (
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
            ))}
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
