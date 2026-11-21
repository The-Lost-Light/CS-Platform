import { useI18n } from "@modules/i18n";
import { ChevronDown, ChevronRight, GitCommit } from "lucide-react";

import type { DiffMode } from "../model/diff";
import type { RepoBundle } from "../model/repository";
import { RepoDiff } from "./RepoDiff";

export function CommitHistory({
  commits,
  expandedCommitSha,
  setExpandedCommitSha,
  diffMode,
  setDiffMode,
}: Pick<RepoBundle, "commits"> & {
  expandedCommitSha: string | null;
  setExpandedCommitSha: (value: string | null) => void;
  diffMode: DiffMode;
  setDiffMode: (value: DiffMode) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="lg:col-span-7 min-w-0 ui-card overflow-hidden">
      <div className="ui-card-header flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="ui-icon-badge w-8 h-8">
            <GitCommit aria-hidden="true" className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-on-primary-container truncate">
            {t("github.commitCount", { count: commits.length.toLocaleString(locale) })}
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

      <div className="p-5">
        <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
          {commits.map((c) => {
            const isExpanded = expandedCommitSha === c.sha;
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
                  className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ui-chip-secondary font-mono text-[11px] px-2.5 py-0.5">
                        {c.sha.slice(0, 7)}
                      </span>
                      {c.prInfo?.merge_method_key && (
                        <span className="ui-chip-primary text-[10px] px-2 py-0.5">
                          {t(c.prInfo.merge_method_key)}
                        </span>
                      )}
                      <span className="text-xs font-bold text-on-surface truncate">{title}</span>
                    </div>
                    <div className="text-[11px] text-on-muted">
                      {t("github.authorLabel")}
                      {author}
                      {t("github.dateLabel")}
                      {dateStr}
                      {c.stats && (
                        <span className="ml-2 font-mono">
                          <span className="text-success">+{c.stats.additions}</span>{" "}
                          <span className="text-danger">-{c.stats.deletions}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown aria-hidden="true" className="w-4 h-4 text-on-muted shrink-0" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="w-4 h-4 text-on-muted shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-3.5 border-t border-outline-subtle space-y-3 bg-surface-container/70">
                    {(c.diffError || !c.files) && (
                      <p role="alert" className="ui-banner-danger text-xs">
                        {t("github.diff.loadFailed")}
                      </p>
                    )}
                    {!c.diffError && c.files?.length === 0 && (
                      <p className="text-xs text-on-muted">{t("github.diff.noFiles")}</p>
                    )}
                    {c.files?.map((f) => (
                      <div
                        key={f.filename}
                        className="rounded-xl border border-outline-subtle overflow-hidden bg-surface"
                      >
                        <div className="px-3.5 py-2 bg-surface-sunken border-b border-outline-subtle flex items-center justify-between text-xs font-mono">
                          <span className="text-on-surface truncate">{f.filename}</span>
                          <span className="shrink-0">
                            <span className="text-success">+{f.additions}</span>{" "}
                            <span className="text-danger">-{f.deletions}</span>
                          </span>
                        </div>
                        {f.patch ? (
                          <RepoDiff patch={f.patch} mode={diffMode} />
                        ) : (
                          <p className="p-3 text-xs text-on-muted">{t("github.diff.noPatch")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
