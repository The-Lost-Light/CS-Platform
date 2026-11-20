import { useI18n } from "@modules/i18n";
import { AlertCircle, FolderGit2, RefreshCw } from "lucide-react";

import type { useRepository } from "../hooks/useRepository";

export function RepositoryConnection({
  repository,
}: {
  repository: ReturnType<typeof useRepository>;
}) {
  const { t } = useI18n();
  const { repoUrlInput, setRepoUrlInput, isLoadingRepo, repoError, handleLoadRepo } = repository;
  return (
    <div className="space-y-4">
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
