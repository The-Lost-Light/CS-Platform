import { useI18n } from "@i18n";
import type { RepoBundle } from "@domain/repository";
import { FolderTree, GitBranch } from "lucide-react";
import { RepoFileTree } from "@pages/project/RepoFileTree";

export function RepositoryTree({
  repo,
  branches,
  fileTree,
  selectedBranch,
  setSelectedBranch,
  fileTreeSearch,
  setFileTreeSearch,
}: Pick<RepoBundle, "repo" | "branches" | "fileTree"> & {
  selectedBranch: string;
  setSelectedBranch: (value: string) => void;
  fileTreeSearch: string;
  setFileTreeSearch: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="lg:col-span-5 ui-card p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-success" />
            <h3 className="text-sm font-bold text-on-surface">
              {t("github.fileTree", { count: fileTree.length })}
            </h3>
          </div>
          <label className="flex min-w-0 max-w-[60%] items-center gap-1 px-2.5 py-0.5 rounded-full bg-success-container font-mono text-[11px] font-bold text-on-success-container">
            <GitBranch className="w-3.5 h-3.5 shrink-0" />
            <span className="shrink-0">{t("github.branchLabel")}</span>
            <select
              aria-label={t("github.branchLabel")}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="min-w-0 cursor-pointer bg-transparent rounded-full focus:outline-hidden focus:ring-2 focus:ring-success"
            >
              {!branches.some((b) => b.name === selectedBranch) && (
                <option value={selectedBranch}>{selectedBranch}</option>
              )}
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input
          type="text"
          value={fileTreeSearch}
          onChange={(e) => setFileTreeSearch(e.target.value)}
          placeholder={t("github.filterPaths")}
          className="ui-input font-mono text-xs"
        />

        <div className="max-h-115 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
          <RepoFileTree
            key={repo.full_name}
            files={fileTree}
            search={fileTreeSearch}
          />
        </div>
      </div>
    </>
  );
}
