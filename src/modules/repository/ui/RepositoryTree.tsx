import { useI18n } from "@modules/i18n";
import { ChevronDown, FolderTree, GitBranch, LoaderCircle, Search } from "lucide-react";

import type { RepoBundle } from "../model/repository";
import { RepoFileTree } from "./RepoFileTree";

export function RepositoryTree({
  repo,
  branches,
  fileTree,
  selectedBranch,
  onBranchChange,
  isLoading,
  fileTreeSearch,
  setFileTreeSearch,
}: Pick<RepoBundle, "repo" | "branches" | "fileTree"> & {
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  isLoading?: boolean;
  fileTreeSearch: string;
  setFileTreeSearch: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="lg:col-span-5 ui-card overflow-hidden">
      <div className="ui-card-header flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="ui-icon-badge w-8 h-8">
            <FolderTree aria-hidden="true" className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-on-primary-container truncate">
            {t("github.fileTree", { count: fileTree.length })}
          </h3>
        </div>
        <label className="ui-chip-success relative border border-success-outline/60 min-w-0 max-w-[60%] font-mono text-[11px] font-bold focus-within:ring-2 focus-within:ring-success">
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
      </div>
      <div className="p-5 space-y-3.5">
        <div className="relative">
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
        <div className="max-h-115 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
          <RepoFileTree key={repo.full_name} files={fileTree} search={fileTreeSearch} />
        </div>
      </div>
    </div>
  );
}
