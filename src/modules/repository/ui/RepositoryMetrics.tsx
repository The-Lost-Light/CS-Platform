import { useI18n } from "@modules/i18n";
import { CircleDot, GitFork, GitPullRequest, SquarePen, Star } from "lucide-react";

import type { RepoBundle } from "../model/repository";
import { IconTooltip } from "./IconTooltip";

export function RepositoryMetrics({
  repo,
  pulls = [],
  onEditRepo,
}: Pick<RepoBundle, "repo" | "pulls"> & {
  onEditRepo: () => void;
}) {
  const { t, locale } = useI18n();
  const issuesCount = (repo.open_issues_count ?? 0).toLocaleString(locale);
  const pullsCount = pulls.length.toLocaleString(locale);
  const forksCount = (repo.forks_count ?? 0).toLocaleString(locale);
  const starsCount = (repo.stargazers_count ?? 0).toLocaleString(locale);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <img
          src={repo.owner.avatar_url || undefined}
          alt={repo.owner.login}
          className="w-11 h-11 rounded-full border border-outline-subtle bg-surface-container object-cover shrink-0"
        />
        <div className="flex items-center gap-2 min-w-0">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="text-lg sm:text-xl font-bold tracking-tight text-on-surface hover:text-primary transition-colors truncate"
          >
            {repo.full_name}
          </a>
          <IconTooltip label={t("github.editRepoUrl")}>
            <button
              type="button"
              onClick={onEditRepo}
              aria-label={t("github.editRepoUrl")}
              className="ui-btn-icon w-8 h-8 rounded-lg bg-surface-container hover:bg-primary-container text-on-muted hover:text-on-primary-container border border-outline-subtle shrink-0"
            >
              <SquarePen aria-hidden="true" className="w-4 h-4" />
            </button>
          </IconTooltip>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
        <IconTooltip label={t("github.openIssues")}>
          <div
            tabIndex={0}
            aria-label={`${t("github.openIssues")}: ${issuesCount}`}
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="w-8 h-8 rounded-lg bg-danger-container text-on-danger-container inline-flex items-center justify-center shrink-0">
              <CircleDot aria-hidden="true" className="w-4 h-4" />
            </span>
            <span className="text-base font-bold text-on-surface font-mono">{issuesCount}</span>
          </div>
        </IconTooltip>

        <IconTooltip label={t("github.pullRequests")}>
          <div
            tabIndex={0}
            aria-label={`${t("github.pullRequests")}: ${pullsCount}`}
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container inline-flex items-center justify-center shrink-0">
              <GitPullRequest aria-hidden="true" className="w-4 h-4" />
            </span>
            <span className="text-base font-bold text-on-surface font-mono">{pullsCount}</span>
          </div>
        </IconTooltip>

        <IconTooltip label={t("github.forks")}>
          <div
            tabIndex={0}
            aria-label={`${t("github.forks")}: ${forksCount}`}
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container inline-flex items-center justify-center shrink-0">
              <GitFork aria-hidden="true" className="w-4 h-4" />
            </span>
            <span className="text-base font-bold text-on-surface font-mono">{forksCount}</span>
          </div>
        </IconTooltip>

        <IconTooltip label={t("github.stars")}>
          <div
            tabIndex={0}
            aria-label={`${t("github.stars")}: ${starsCount}`}
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="w-8 h-8 rounded-lg bg-warning-container text-on-warning-container inline-flex items-center justify-center shrink-0">
              <Star aria-hidden="true" className="w-4 h-4" />
            </span>
            <span className="text-base font-bold text-on-surface font-mono">{starsCount}</span>
          </div>
        </IconTooltip>
      </div>
    </div>
  );
}
