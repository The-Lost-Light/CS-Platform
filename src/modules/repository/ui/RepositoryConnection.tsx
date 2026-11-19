import { useI18n } from "@modules/i18n";
import { useSettings } from "@modules/settings";
import { AlertCircle, FolderGit2, KeyRound, RefreshCw, Settings } from "lucide-react";

import type { useRepository } from "../hooks/useRepository";

export function RepositoryConnection({
  repository,
}: {
  repository: ReturnType<typeof useRepository>;
}) {
  const { t } = useI18n();
  const { openSettings } = useSettings();
  const {
    repoUrlInput,
    setRepoUrlInput,
    hasGithubToken,
    isLoadingRepo,
    repoError,
    handleLoadRepo,
  } = repository;
  return (
    <div className="ui-card p-5 sm:p-6 space-y-4">
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

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-outline-subtle">
        <span className={hasGithubToken ? "ui-chip-success" : "ui-chip-neutral"}>
          <KeyRound aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>
            {t(hasGithubToken ? "workspace.tokenStatusConfigured" : "workspace.tokenStatusPublic")}
          </span>
        </span>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => openSettings("github")}
          className="ui-btn-outlined px-3 py-1.5"
        >
          <Settings aria-hidden="true" className="w-3.5 h-3.5 text-primary" />
          <span>{t("workspace.manageToken")}</span>
        </button>
      </div>

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
