import { useI18n } from "@modules/i18n";
import { ChevronDown, FolderTree, GitBranch, LoaderCircle, Search, Tag } from "lucide-react";

import type { RepoBundle } from "../model/repository";
import { IconTooltip } from "./IconTooltip";
import { RepoFileTree } from "./RepoFileTree";

export function RepositoryTree({
  repo,
  branches,
  tags = [],
  fileTree,
  selectedBranch,
  onBranchChange,
  isLoading,
  fileTreeSearch,
  setFileTreeSearch,
}: Pick<RepoBundle, "repo" | "branches" | "tags" | "fileTree"> & {
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  isLoading?: boolean;
  fileTreeSearch: string;
  setFileTreeSearch: (value: string) => void;
}) {
  const { t, locale } = useI18n();
  const branchCount = branches.length.toLocaleString(locale);
  const tagCount = tags.length.toLocaleString(locale);
  const totalFilesCount = fileTree.length.toLocaleString(locale);

  return (
    <div className="lg:col-span-5 min-w-0 ui-card overflow-hidden flex flex-col h-170">
      <div className="ui-card-header shrink-0 min-h-16 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <label className="ui-chip-success relative border border-success-outline/60 min-w-0 max-w-full font-mono text-[11px] font-bold focus-within:ring-2 focus-within:ring-success">
            <GitBranch aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span className="shrink-0">{t("github.branchLabel")}</span>
            <span aria-hidden="true" className="truncate">
              {selectedBranch}
            </span>
            {isLoading ? (
              <LoaderCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0 animate-spin" />
            ) : (
              <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            )}
            <select
              aria-label={t("github.branchLabel")}
              value={selectedBranch}
              disabled={isLoading}
              onChange={(e) => onBranchChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0 disabled:cursor-wait"
            >
              {Array.from(
                new Set([
                  repo.default_branch || "main",
                  ...branches.map((b) => b.name),
                  selectedBranch,
                ]),
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <IconTooltip label={t("github.branches")}>
            <span
              tabIndex={0}
              aria-label={`${t("github.branches")}: ${branchCount}`}
              className="ui-chip-neutral font-mono text-[11px] font-bold cursor-default focus-visible:outline-2 focus-visible:outline-primary"
            >
              <GitBranch aria-hidden="true" className="w-3.5 h-3.5 text-success shrink-0" />
              <span className="text-on-surface">{branchCount}</span>
            </span>
          </IconTooltip>

          <IconTooltip label={t("github.tags")}>
            <span
              tabIndex={0}
              aria-label={`${t("github.tags")}: ${tagCount}`}
              className="ui-chip-neutral font-mono text-[11px] font-bold cursor-default focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Tag aria-hidden="true" className="w-3.5 h-3.5 text-secondary shrink-0" />
              <span className="text-on-surface">{tagCount}</span>
            </span>
          </IconTooltip>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-on-primary-container shrink-0">
          <FolderTree aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />
          <span>{t("github.totalFilesCount", { count: totalFilesCount })}</span>
        </div>
      </div>
      <div className="p-5 flex-1 min-h-0 flex flex-col gap-3.5">
        <div className="relative shrink-0">
          <Search
            aria-hidden="true"
            className="w-4 h-4 text-on-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="text"
            value={fileTreeSearch}
            onChange={(e) => setFileTreeSearch(e.target.value)}
            placeholder={t("github.filterPaths")}
            className="ui-input pl-9 font-mono text-xs"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
          <RepoFileTree key={repo.full_name} files={fileTree} search={fileTreeSearch} />
        </div>
      </div>
    </div>
  );
}
