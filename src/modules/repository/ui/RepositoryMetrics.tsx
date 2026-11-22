import { useI18n } from "@modules/i18n";
import { IconBadge, IconButton, Tooltip } from "@shared/ui";
import { CircleDot, GitFork, GitPullRequest, SquarePen, Star } from "lucide-react";

import type { RepoBundle } from "../model/repository";

export function RepositoryMetrics({
  repo,
  pulls = [],
  totalPulls,
  openIssuesCount,
  onEditRepo,
}: Pick<RepoBundle, "repo" | "pulls" | "totalPulls" | "openIssuesCount"> & {
  onEditRepo?: () => void;
}) {
  const { t, locale } = useI18n();
  const resolvedPullsCount = totalPulls ?? pulls.length;
  const pullsCount = resolvedPullsCount.toLocaleString(locale);
  const resolvedOpenIssues =
    openIssuesCount ?? Math.max(0, (repo.open_issues_count ?? 0) - resolvedPullsCount);
  const issuesCount = resolvedOpenIssues.toLocaleString(locale);
  const forksCount = (repo.forks_count ?? 0).toLocaleString(locale);
  const starsCount = (repo.stargazers_count ?? 0).toLocaleString(locale);

  const metrics = [
    { label: t("github.openIssues"), count: issuesCount, icon: CircleDot, tone: "danger" },
    { label: t("github.pullRequests"), count: pullsCount, icon: GitPullRequest, tone: "tonal" },
    { label: t("github.forks"), count: forksCount, icon: GitFork, tone: "secondary" },
    { label: t("github.stars"), count: starsCount, icon: Star, tone: "warning" },
  ] as const;

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
          {onEditRepo && (
            <Tooltip label={t("github.editRepoUrl")}>
              <IconButton
                variant="surface"
                icon={SquarePen}
                label={t("github.editRepoUrl")}
                onClick={onEditRepo}
              />
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
        {metrics.map(({ label, count, icon, tone }) => (
          <Tooltip key={label} label={label}>
            <div
              tabIndex={0}
              aria-label={`${label}: ${count}`}
              className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <IconBadge as="span" size="sm" tone={tone} icon={icon} />
              <span className="text-base font-bold text-on-surface font-mono">{count}</span>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
