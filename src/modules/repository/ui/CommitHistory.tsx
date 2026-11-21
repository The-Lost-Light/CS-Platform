import { useI18n } from "@modules/i18n";
import { ChevronDown, ChevronRight, GitCommit, LoaderCircle } from "lucide-react";

import type { DiffMode } from "../model/diff";
import type { RepoBundle } from "../model/repository";
import { RepoDiff } from "./RepoDiff";

export function CommitHistory({
  commits,
  totalCommits,
  expandedCommitSha,
  setExpandedCommitSha,
  loadingCommitSha = null,
  hasMoreCommits,
  isLoadingMore = false,
  onLoadMore,
  diffMode,
  setDiffMode,
}: Pick<RepoBundle, "commits" | "totalCommits"> & {
  expandedCommitSha: string | null;
  setExpandedCommitSha: (value: string | null) => void;
  loadingCommitSha?: string | null;
  hasMoreCommits?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  diffMode: DiffMode;
  setDiffMode: (value: DiffMode) => void;
}) {
  const { t, locale } = useI18n();
  const resolvedTotalCommits = Math.max(totalCommits ?? commits.length, commits.length);
  const showLoadMore = hasMoreCommits ?? commits.length < resolvedTotalCommits;

  return (
    <div className="lg:col-span-7 min-w-0 ui-card overflow-hidden flex flex-col h-170">
      <div className="ui-card-header shrink-0 min-h-16 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="ui-icon-badge w-8 h-8">
            <GitCommit aria-hidden="true" className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-on-primary-container truncate">
            {t("github.commitCount", { count: resolvedTotalCommits.toLocaleString(locale) })}
          </h3>
        </div>
        <div className="ui-pill-group text-[11px]">
          <button
            type="button"
            onClick={() => setDiffMode("unified")}
            aria-pressed={diffMode === "unified"}
            className={`ui-pill-item px-3 py-1 ${
              diffMode === "unified" ? "ui-pill-item-active" : "ui-pill-item-idle"
            }`}
          >
            {t("github.diff.unified")}
          </button>
          <button
            type="button"
            onClick={() => setDiffMode("split")}
            aria-pressed={diffMode === "split"}
            className={`ui-pill-item px-3 py-1 ${
              diffMode === "split" ? "ui-pill-item-active" : "ui-pill-item-idle"
            }`}
          >
            {t("github.diff.split")}
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1">
          {commits.map((c) => {
            const isExpanded = expandedCommitSha === c.sha;
            const isLoadingCommit = loadingCommitSha === c.sha;
            const title = (c.commit?.message || "").split("\n")[0];
            const author = c.commit?.author?.name || c.author?.login || "Developer";
            const commitDate = new Date(c.commit?.author?.date || "");
            const dateStr = Number.isNaN(commitDate.getTime())
              ? ""
              : commitDate.toLocaleDateString(locale);

            return (
              <div key={c.sha} className="ui-panel overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedCommitSha(isExpanded ? null : c.sha)}
                  className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="ui-chip-secondary font-mono text-[11px] px-2.5 py-0.5 shrink-0">
                      {c.sha.slice(0, 7)}
                    </span>
                    {c.prInfo?.merge_method_key && (
                      <span className="ui-chip-primary text-[10px] px-2 py-0.5 shrink-0">
                        {t(c.prInfo.merge_method_key)}
                      </span>
                    )}
                    <span className="text-xs font-bold text-on-surface truncate">{title}</span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-[11px] text-on-muted whitespace-nowrap">
                      {c.stats && (
                        <span className="mr-2 font-mono">
                          <span className="text-success">+{c.stats.additions}</span>{" "}
                          <span className="text-danger">-{c.stats.deletions}</span>
                        </span>
                      )}
                      {t("github.authorLabel")}
                      {author}
                      {t("github.dateLabel")}
                      {dateStr}
                    </div>
                    {isExpanded ? (
                      <ChevronDown aria-hidden="true" className="w-4 h-4 text-on-muted shrink-0" />
                    ) : (
                      <ChevronRight aria-hidden="true" className="w-4 h-4 text-on-muted shrink-0" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3.5 border-t border-outline-subtle space-y-3 bg-surface-container/70">
                    {isLoadingCommit ? (
                      <div className="flex items-center gap-2 text-xs text-on-muted py-2">
                        <LoaderCircle
                          aria-hidden="true"
                          className="w-4 h-4 animate-spin shrink-0"
                        />
                        <span>{t("common.loading")}</span>
                      </div>
                    ) : (
                      <>
                        {(c.diffError || !c.files) && (
                          <p role="alert" className="ui-banner-danger text-xs">
                            {t("github.diff.loadFailed")}
                          </p>
                        )}
                        {!c.diffError && c.files?.length === 0 && (
                          <p className="text-xs text-on-muted">{t("github.diff.noFiles")}</p>
                        )}
                        {c.files?.map((f) => (
                          <details
                            key={f.filename}
                            className="group/file rounded-xl border border-outline-subtle overflow-hidden bg-surface"
                          >
                            <summary className="px-3.5 py-2 bg-surface-sunken hover:bg-surface-hover cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-mono transition-colors [&::-webkit-details-marker]:hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronRight
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 text-on-muted shrink-0 transition-transform group-open/file:rotate-90"
                                />
                                <span className="text-on-surface truncate">{f.filename}</span>
                              </div>
                              <span className="shrink-0">
                                <span className="text-success">+{f.additions}</span>{" "}
                                <span className="text-danger">-{f.deletions}</span>
                              </span>
                            </summary>
                            <div className="border-t border-outline-subtle">
                              {f.patch ? (
                                <RepoDiff patch={f.patch} mode={diffMode} />
                              ) : (
                                <p className="p-3 text-xs text-on-muted">
                                  {t("github.diff.noPatch")}
                                </p>
                              )}
                            </div>
                          </details>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {showLoadMore && (
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="ui-btn-outlined w-full"
              >
                {isLoadingMore && (
                  <LoaderCircle aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>{isLoadingMore ? t("common.loading") : t("github.loadMoreCommits")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
