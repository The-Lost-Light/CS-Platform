import { useI18n } from "@modules/i18n";
import { AlertCircle, FolderGit2, KeyRound, RefreshCw } from "lucide-react";

import type { useRepository } from "../hooks/useRepository";

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
          aria-expanded={showTokenInput}
          onClick={() => setShowTokenInput(!showTokenInput)}
          className={showTokenInput ? "ui-btn-tonal" : "ui-btn-outlined"}
        >
          <KeyRound aria-hidden="true" className="w-3.5 h-3.5" />
          <span>{t("workspace.githubToken")}</span>
        </button>
      </div>

      {showTokenInput && (
        <div className="ui-panel p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
          <span className="font-semibold text-on-muted shrink-0">Personal Access Token:</span>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder={t("workspace.tokenPlaceholder")}
            className="ui-input flex-1 font-mono"
          />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleLoadRepo(repoUrlInput);
        }}
        className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-1"
      >
        <div className="relative flex-1">
          <FolderGit2
            aria-hidden="true"
            className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="text"
            value={repoUrlInput}
            onChange={(e) => setRepoUrlInput(e.target.value)}
            placeholder={t("workspace.repoPlaceholder")}
            className="ui-input pl-10 pr-4 font-mono"
          />
        </div>
        <button type="submit" disabled={isLoadingRepo} className="ui-btn-primary shrink-0">
          <RefreshCw
            aria-hidden="true"
            className={`w-4 h-4 ${isLoadingRepo ? "animate-spin" : ""}`}
          />
          <span>{t("workspace.sync")}</span>
        </button>
      </form>

      {repoError && (
        <div role="alert" className="ui-banner-danger">
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>{"key" in repoError ? t(repoError.key) : repoError.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
