import { Link } from "@void/react";
import type { User } from "@modules/auth";
import type { Project } from "@modules/projects";
import { useI18n, LanguageSwitcher } from "@modules/i18n";
import { ThemeSwitcher } from "@modules/theme";
import { Code2, FolderGit2, Home, LogOut } from "lucide-react";

export function Navbar({
  activeView,
  selectedProject,
  onNavigateHome,
  onSelectProjectDefault,
  currentUser,
  onLogout,
  hasProjects = true,
}: {
  activeView: "home" | "project" | "admin";
  selectedProject: Project | null;
  onNavigateHome: () => void;
  onSelectProjectDefault: () => void;
  currentUser: User;
  onLogout: () => void;
  hasProjects?: boolean;
}) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-outline shadow-xs transition-colors">
      <div className="w-full px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-left group focus:outline-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shadow-xs group-hover:opacity-90 transition">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-on-surface">
                  CodePulse Edu
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                  Material Design
                </span>
              </div>
            </div>
          </button>

          {selectedProject && activeView === "project" && (
            <div className="hidden xl:flex items-center gap-2 pl-2.5 ml-1 border-l border-outline text-xs">
              <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-primary-container text-on-primary-container">
                {selectedProject.codeName}
              </span>
              <span className="text-on-surface font-semibold truncate max-w-60">
                {selectedProject.title}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex max-w-full flex-wrap items-center gap-1 bg-surface-container p-1 rounded-2xl sm:rounded-full border border-outline">
            <button
              type="button"
              onClick={onNavigateHome}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                activeView === "home"
                  ? "bg-secondary text-on-secondary shadow-xs"
                  : "text-on-muted hover:bg-surface-hover hover:text-on-surface"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t("nav.home")}</span>
            </button>
            <button
              type="button"
              onClick={onSelectProjectDefault}
              disabled={!hasProjects}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                activeView === "project"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-muted hover:bg-surface-hover hover:text-on-surface"
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{t("common.projects")}</span>
            </button>
            {currentUser.role === "admin" && (
              <Link
                href="/admin"
                className={
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition " +
                  (activeView === "admin"
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-muted hover:bg-surface-hover hover:text-on-surface")
                }
              >
                {t("admin.mode")}
              </Link>
            )}
          </nav>
          <LanguageSwitcher />
          <ThemeSwitcher size="xs" />

          {currentUser && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-outline">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-sunken border border-outline text-xs">
                <div className="w-5 h-5 rounded-full bg-secondary text-on-secondary text-[11px] font-bold flex items-center justify-center">
                  {currentUser.name?.slice(0, 1) || "S"}
                </div>
                <span className="font-bold text-on-surface">{currentUser.name}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container hover:bg-danger-container text-on-muted hover:text-on-danger-container border border-outline text-xs font-bold transition"
                title={t("auth.signOutDescription")}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t("auth.signOut")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
