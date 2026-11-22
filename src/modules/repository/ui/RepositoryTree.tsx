import { useI18n } from "@modules/i18n";
import { Card, CardHeader, Chip, TextInput, Tooltip } from "@shared/ui";
import { FolderTree, GitBranch, Search, Tag } from "lucide-react";

import type { RepoBundle } from "../model/repository";
import { BranchSelector } from "./BranchSelector";
import { RepoFileTree } from "./RepoFileTree";

export function RepositoryTree({
  repo,
  branches,
  totalBranches,
  hasMoreBranches = false,
  isLoadingMoreBranches = false,
  onLoadMoreBranches,
  tags = [],
  totalTags,
  fileTree,
  selectedBranch,
  onBranchChange,
  isLoading,
  fileTreeSearch,
  setFileTreeSearch,
}: Pick<
  RepoBundle,
  "repo" | "branches" | "totalBranches" | "hasMoreBranches" | "tags" | "totalTags" | "fileTree"
> & {
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  isLoading?: boolean;
  isLoadingMoreBranches?: boolean;
  onLoadMoreBranches?: () => void;
  fileTreeSearch: string;
  setFileTreeSearch: (value: string) => void;
}) {
  const { t, locale } = useI18n();
  const resolvedBranchTotal = Math.max(totalBranches ?? branches.length, branches.length);
  const resolvedTagTotal = Math.max(totalTags ?? tags.length, tags.length);
  const branchCount = resolvedBranchTotal.toLocaleString(locale);
  const tagCount = resolvedTagTotal.toLocaleString(locale);
  const totalFilesCount = fileTree.length.toLocaleString(locale);

  return (
    <Card as="div" className="lg:col-span-5 min-w-0 flex flex-col h-170">
      <CardHeader layoutClassName="min-h-16 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <BranchSelector
            defaultBranch={repo.default_branch || "main"}
            branches={branches}
            totalBranches={resolvedBranchTotal}
            selectedBranch={selectedBranch}
            onBranchChange={onBranchChange}
            isLoading={isLoading}
            hasMoreBranches={hasMoreBranches}
            isLoadingMoreBranches={isLoadingMoreBranches}
            onLoadMoreBranches={onLoadMoreBranches}
          />

          <Tooltip label={t("github.branches")}>
            <Chip
              variant="neutral"
              mono
              icon={GitBranch}
              iconClassName="text-success"
              tabIndex={0}
              aria-label={`${t("github.branches")}: ${branchCount}`}
              className="text-[11px] font-bold cursor-default focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="text-on-surface">{branchCount}</span>
            </Chip>
          </Tooltip>

          <Tooltip label={t("github.tags")}>
            <Chip
              variant="neutral"
              mono
              icon={Tag}
              iconClassName="text-secondary"
              tabIndex={0}
              aria-label={`${t("github.tags")}: ${tagCount}`}
              className="text-[11px] font-bold cursor-default focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="text-on-surface">{tagCount}</span>
            </Chip>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-on-primary-container shrink-0">
          <FolderTree aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />
          <span>{t("github.totalFilesCount", { count: totalFilesCount })}</span>
        </div>
      </CardHeader>
      <div className="p-5 flex-1 min-h-0 flex flex-col gap-3.5">
        <TextInput
          icon={Search}
          mono
          type="text"
          value={fileTreeSearch}
          onChange={(e) => setFileTreeSearch(e.target.value)}
          placeholder={t("github.filterPaths")}
          wrapperClassName="shrink-0"
          className="pl-9 text-xs"
        />
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
          <RepoFileTree key={repo.full_name} files={fileTree} search={fileTreeSearch} />
        </div>
      </div>
    </Card>
  );
}
