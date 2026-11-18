import { AlertCircle, FolderGit2, KeyRound, RefreshCw } from "lucide-react";
import { useI18n } from "@i18n";
import type { useRepository } from "@hooks/useRepository";

export function RepositoryConnection({
  repository,
}: {
  repository: ReturnType<typeof useRepository>;
}) {
  const { t } = useI18n();
  const {
    repoUrlInput,
    setRepoUrlInput,
    githubToken,
    setGithubToken,
    showTokenInput,
    setShowTokenInput,
    isLoadingRepo,
    repoError,
    handleLoadRepo,
  } = repository;
  return (
    <div className="ui-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowTokenInput(!showTokenInput)}
          className="px-3.5 py-1.5 rounded-full bg-surface-high hover:bg-secondary-container text-on-surface hover:text-on-secondary-container border border-outline text-xs font-semibold inline-flex items-center gap-1.5 transition"
        >
          <KeyRound className="w-3.5 h-3.5 text-warning" />
          <span>{t("workspace.githubToken")}</span>
        </button>
      </div>

      {showTokenInput && (
        <div className="ui-panel p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
          <span className="font-semibold text-on-muted shrink-0">
            Personal Access Token:
          </span>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder={t("workspace.tokenPlaceholder")}
            className="flex-1 px-3 py-2 bg-surface border border-outline rounded-xl text-on-surface font-mono focus:outline-hidden focus:ring-2 focus:ring-secondary"
          />
        </div>
      )}

      {/* GitHub Repo URL Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLoadRepo(repoUrlInput);
        }}
        className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-1"
      >
        <div className="relative flex-1">
          <FolderGit2 className="w-4 h-4 text-primary absolute left-3.5 top-3" />
          <input
            type="text"
            value={repoUrlInput}
            onChange={(e) => setRepoUrlInput(e.target.value)}
            placeholder={t("workspace.repoPlaceholder")}
            className="ui-input pl-10 pr-4 py-2.5 font-mono focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={isLoadingRepo}
          className="ui-btn-primary px-5 py-2.5 text-xs sm:text-sm shrink-0"
        >
          <RefreshCw
            className={`w-4 h-4 ${isLoadingRepo ? "animate-spin" : ""}`}
          />
          <span>{t("workspace.sync")}</span>
        </button>
      </form>

      {repoError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-danger-container border border-danger-outline text-on-danger-container text-xs font-semibold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {"key" in repoError ? t(repoError.key) : repoError.message}
          </span>
        </div>
      )}
    </div>
  );
}
