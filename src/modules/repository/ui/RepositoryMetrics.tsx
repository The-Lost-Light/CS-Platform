import { useI18n } from "@modules/i18n";
import { AlertCircle, Code2, FolderTree, GitBranch, GitFork, Star } from "lucide-react";

import type { RepoBundle } from "../model/repository";

export function RepositoryMetrics({
  repo,
  branches,
  fileTree,
}: Pick<RepoBundle, "repo" | "branches" | "fileTree">) {
  const { t, locale } = useI18n();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="ui-card-sm">
        <div className="text-xs font-medium text-on-muted flex items-center justify-between gap-2">
          <span>{t("github.stars")}</span>
          <span className="w-7 h-7 rounded-lg bg-warning-container text-on-warning-container inline-flex items-center justify-center shrink-0">
            <Star aria-hidden="true" className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xl font-bold text-on-surface font-mono mt-2">
          {repo.stargazers_count?.toLocaleString(locale) || 0}
        </div>
      </div>

      <div className="ui-card-sm">
        <div className="text-xs font-medium text-on-muted flex items-center justify-between gap-2">
          <span>{t("github.forks")}</span>
          <span className="w-7 h-7 rounded-lg bg-secondary-container text-on-secondary-container inline-flex items-center justify-center shrink-0">
            <GitFork aria-hidden="true" className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xl font-bold text-on-surface font-mono mt-2">
          {repo.forks_count?.toLocaleString(locale) || 0}
        </div>
      </div>

      <div className="ui-card-sm">
        <div className="text-xs font-medium text-on-muted flex items-center justify-between gap-2">
          <span>{t("github.openIssues")}</span>
          <span className="w-7 h-7 rounded-lg bg-danger-container text-on-danger-container inline-flex items-center justify-center shrink-0">
            <AlertCircle aria-hidden="true" className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xl font-bold text-on-surface font-mono mt-2">
          {repo.open_issues_count?.toLocaleString(locale) || 0}
        </div>
      </div>

      <div className="ui-card-sm">
        <div className="text-xs font-medium text-on-muted flex items-center justify-between gap-2">
          <span>{t("github.branches")}</span>
          <span className="w-7 h-7 rounded-lg bg-success-container text-on-success-container inline-flex items-center justify-center shrink-0">
            <GitBranch aria-hidden="true" className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xl font-bold text-on-surface font-mono mt-2">{branches.length}</div>
      </div>

      <div className="ui-card-sm">
        <div className="text-xs font-medium text-on-muted flex items-center justify-between gap-2">
          <span>{t("github.totalFiles")}</span>
          <span className="w-7 h-7 rounded-lg bg-secondary-container text-on-secondary-container inline-flex items-center justify-center shrink-0">
            <FolderTree aria-hidden="true" className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xl font-bold text-on-surface font-mono mt-2">{fileTree.length}</div>
      </div>

      <div className="ui-card-sm">
        <div className="text-xs font-medium text-on-muted flex items-center justify-between gap-2">
          <span>{t("github.primaryLanguage")}</span>
          <span className="w-7 h-7 rounded-lg bg-primary-container text-on-primary-container inline-flex items-center justify-center shrink-0">
            <Code2 aria-hidden="true" className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xl font-bold text-on-surface mt-2 truncate">
          {repo.language || "TypeScript"}
        </div>
      </div>
    </div>
  );
}
