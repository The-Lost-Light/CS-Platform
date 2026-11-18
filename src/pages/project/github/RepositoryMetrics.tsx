import type { RepoBundle } from "@domain/repository";
import { useI18n } from "@i18n";
import { AlertCircle, Code2, FolderTree, GitBranch, GitFork, Star } from "lucide-react";

export function RepositoryMetrics({
  repo,
  branches,
  fileTree,
}: Pick<RepoBundle, "repo" | "branches" | "fileTree">) {
  const { t, locale } = useI18n();
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t("github.stars")}</span>
            <Star className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">
            {repo.stargazers_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t("github.forks")}</span>
            <GitFork className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">
            {repo.forks_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t("github.openIssues")}</span>
            <AlertCircle className="w-3.5 h-3.5 text-danger" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">
            {repo.open_issues_count?.toLocaleString(locale) || 0}
          </div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t("github.branches")}</span>
            <GitBranch className="w-3.5 h-3.5 text-success" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">{branches.length}</div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t("github.totalFiles")}</span>
            <FolderTree className="w-3.5 h-3.5 text-secondary" />
          </div>
          <div className="text-lg font-bold text-on-surface font-mono mt-1">{fileTree.length}</div>
        </div>

        <div className="ui-card-sm">
          <div className="text-xs font-medium text-on-muted flex items-center justify-between">
            <span>{t("github.primaryLanguage")}</span>
            <Code2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-lg font-bold text-on-surface mt-1 truncate">
            {repo.language || "TypeScript"}
          </div>
        </div>
      </div>
    </>
  );
}
