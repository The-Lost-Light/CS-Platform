import { useI18n } from "@modules/i18n";
import { AlertCircle, FolderGit2, RefreshCw } from "lucide-react";

import type { useRepository } from "../hooks/useRepository";
import { RepositoryLanguages } from "./RepositoryLanguages";
import { RepositoryMetrics } from "./RepositoryMetrics";

export function RepositoryConnection({
  repository,
  readOnly = false,
}: {
  repository: ReturnType<typeof useRepository>;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const {
    repoUrl,
    repoUrlInput,
    setRepoUrlInput,
    repoBundle,
    isEditingRepo,
    startEditingRepo,
    isLoadingRepo,
    repoError,
    handleLoadRepo,
  } = repository;
  const showOverview = Boolean(repoBundle?.repo) && !isEditingRepo;

  return (
    <div className="space-y-4">
      {showOverview && repoBundle ? (
        <>
          <RepositoryMetrics
            repo={repoBundle.repo}
            pulls={repoBundle.pulls}
            totalPulls={repoBundle.totalPulls}
            openIssuesCount={repoBundle.openIssuesCount}
            onEditRepo={readOnly ? undefined : startEditingRepo}
          />
          <RepositoryLanguages languages={repoBundle.languages} />
        </>
      ) : readOnly ? (
        repoUrl.trim() ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FolderGit2 aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />
              <span className="font-mono text-xs sm:text-sm text-on-surface truncate">
                {repoUrl}
              </span>
            </div>
            <button
              type="button"
              disabled={isLoadingRepo}
              onClick={() => void handleLoadRepo(repoUrl)}
              className="ui-btn-outlined shrink-0"
            >
              <RefreshCw
                aria-hidden="true"
                className={`w-4 h-4 ${isLoadingRepo ? "animate-spin" : ""}`}
              />
              <span>{t("workspace.sync")}</span>
            </button>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-on-muted">{t("workspace.studentNoRepo")}</p>
        )
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLoadRepo(repoUrlInput);
          }}
          className="flex flex-col md:flex-row items-stretch md:items-center gap-3"
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
      )}

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
