import type { User } from "@modules/auth";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { SettingsButton } from "@modules/settings";
import { Link } from "@void/react";
import { Code2, FolderGit2, Home, LogOut, ShieldCheck } from "lucide-react";

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
    <header className="sticky top-0 z-40 bg-surface-elevated backdrop-blur-xl border-b border-outline-subtle shadow-m3-1 transition-colors">
      <div className="w-full px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 text-left group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
          >
            <div className="ui-icon-badge w-9 h-9 group-hover:opacity-90 transition">
              <Code2 aria-hidden="true" className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-on-surface">
                CodePulse Edu
              </span>
              <span className="ui-chip-secondary text-[11px] px-2 py-0.5">Material You 3</span>
            </div>
          </button>

          {selectedProject && activeView === "project" && (
            <div className="hidden xl:flex items-center gap-2 pl-3 ml-1 border-l border-outline-subtle text-xs min-w-0">
              <span className="ui-code-badge">{selectedProject.codeName}</span>
              <span className="text-on-surface font-semibold truncate max-w-60">
                {selectedProject.title}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav className="ui-pill-group max-w-full flex-wrap rounded-2xl sm:rounded-full">
            <button
              type="button"
              onClick={onNavigateHome}
              className={`ui-pill-item ${
                activeView === "home" ? "ui-pill-item-active" : "ui-pill-item-idle"
              }`}
            >
              <Home aria-hidden="true" className="w-3.5 h-3.5" />
              <span>{t("nav.home")}</span>
            </button>
            <button
              type="button"
              onClick={onSelectProjectDefault}
              disabled={!hasProjects}
              className={`ui-pill-item ${
                activeView === "project" ? "ui-pill-item-active" : "ui-pill-item-idle"
              }`}
            >
              <FolderGit2 aria-hidden="true" className="w-3.5 h-3.5" />
              <span>{t("common.projects")}</span>
            </button>
            {currentUser.role === "admin" && (
              <Link
                href="/admin"
                className={`ui-pill-item ${
                  activeView === "admin" ? "ui-pill-item-active" : "ui-pill-item-idle"
                }`}
              >
                <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{t("admin.mode")}</span>
              </Link>
            )}
          </nav>

          <SettingsButton />

          {currentUser && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-outline-subtle">
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container border border-outline-subtle text-xs">
                <div className="w-5 h-5 rounded-full bg-primary-container text-on-primary-container text-[11px] font-bold flex items-center justify-center shrink-0">
                  {currentUser.name?.slice(0, 1) || "S"}
                </div>
                <span className="font-semibold text-on-surface">{currentUser.name}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="ui-btn-outlined px-3 py-1.5 hover:bg-danger-container hover:text-on-danger-container hover:border-danger-outline/60"
                title={t("auth.signOutDescription")}
              >
                <LogOut aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{t("auth.signOut")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
