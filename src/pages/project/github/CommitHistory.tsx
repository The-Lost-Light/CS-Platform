import { useI18n } from "@i18n";
import type { RepoBundle } from "@domain/repository";
import { GitCommit, ChevronDown, ChevronRight } from "lucide-react";
import { RepoDiff } from "@pages/project/RepoDiff";
import type { DiffMode } from "@domain/diff";

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
    <>
      <div className="lg:col-span-7 min-w-0 ui-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline pb-3.5">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-bold text-on-surface">
              {t("github.commitHistory")}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="ui-pill-group text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setDiffMode("unified")}
                aria-pressed={diffMode === "unified"}
                className={`px-2.5 py-0.5 rounded-full transition ${
                  diffMode === "unified"
                    ? "bg-secondary text-on-secondary shadow-2xs"
                    : "text-on-muted"
                }`}
              >
                {t("github.diff.unified")}
              </button>
              <button
                type="button"
                onClick={() => setDiffMode("split")}
                aria-pressed={diffMode === "split"}
                className={`px-2.5 py-0.5 rounded-full transition ${
                  diffMode === "split"
                    ? "bg-secondary text-on-secondary shadow-2xs"
                    : "text-on-muted"
                }`}
              >
                {t("github.diff.split")}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
          {commits.map((c) => {
            const isExpanded = expandedCommitSha === c.sha;
            const title = (c.commit?.message || "").split("\n")[0];
            const author =
              c.commit?.author?.name || c.author?.login || "Developer";
            const commitDate = new Date(c.commit?.author?.date || "");
            const dateStr = Number.isNaN(commitDate.getTime())
              ? ""
              : commitDate.toLocaleDateString(locale);

            return (
              <div key={c.sha} className="ui-panel overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedCommitSha(isExpanded ? null : c.sha)
                  }
                  className="w-full p-3.5 text-left flex items-start justify-between gap-3 hover:bg-surface-hover transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container font-bold font-mono text-[11px]">
                        {c.sha.slice(0, 7)}
                      </span>
                      {c.prInfo?.merge_method_key && (
                        <span className="px-2 py-0.5 rounded-md bg-primary-container text-on-primary-container font-bold text-[10px]">
                          {t(c.prInfo.merge_method_key)}
                        </span>
                      )}
                      <span className="text-xs font-bold text-on-surface truncate">
                        {title}
                      </span>
                    </div>
                    <div className="text-[11px] text-on-muted">
                      {t("github.authorLabel")}
                      {author}
                      {t("github.dateLabel")}
                      {dateStr}
                      {c.stats && (
                        <span className="ml-2 font-mono">
                          <span className="text-success">
                            +{c.stats.additions}
                          </span>{" "}
                          <span className="text-danger">
                            -{c.stats.deletions}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-on-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-on-muted shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-3 border-t border-outline space-y-2.5 bg-surface-high">
                    {(c.diffError || !c.files) && (
                      <p role="alert" className="text-xs text-danger">
                        {t("github.diff.loadFailed")}
                        {c.diffError && ` (${c.diffError})`}
                      </p>
                    )}
                    {!c.diffError && c.files?.length === 0 && (
                      <p className="text-xs text-on-muted">
                        {t("github.diff.noFiles")}
                      </p>
                    )}
                    {c.files?.map((f) => {
                      return (
                        <div
                          key={f.filename}
                          className="rounded-xl border border-outline overflow-hidden bg-surface"
                        >
                          <div className="px-3 py-1.5 bg-surface-sunken border-b border-outline flex items-center justify-between text-xs font-mono">
                            <span className="text-on-surface truncate">
                              {f.filename}
                            </span>
                            <span className="shrink-0">
                              <span className="text-success">
                                +{f.additions}
                              </span>{" "}
                              <span className="text-danger">
                                -{f.deletions}
                              </span>
                            </span>
                          </div>
                          {f.patch ? (
                            <RepoDiff patch={f.patch} mode={diffMode} />
                          ) : (
                            <p className="p-3 text-xs text-on-muted">
                              {t("github.diff.noPatch")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
