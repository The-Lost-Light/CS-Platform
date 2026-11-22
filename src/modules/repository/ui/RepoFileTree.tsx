import { cn } from "@shared/ui";
import { ChevronRight, FileCode2, Folder } from "lucide-react";
import { memo, useDeferredValue, useMemo } from "react";

import { buildRepoFileTree, type TreeNode } from "../model/fileTree";
import type { RepoBundle } from "../model/repository";

function TreeEntriesList({
  nodes,
  searching,
}: {
  nodes: Map<string, TreeNode>;
  searching: boolean;
}) {
  const sorted = [...nodes.values()].sort(
    (a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name),
  );

  return (
    <ul className="space-y-1">
      {sorted.map((node) => (
        <li key={node.path}>
          {node.directory ? (
            <details open={searching || undefined} className="group/folder">
              <summary title={node.path} className="ui-tree-folder">
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 transition-transform group-open/folder:rotate-90"
                />
                <Folder aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-success" />
                <span className="truncate">{node.name}</span>
              </summary>
              <div className="ml-3 border-l border-outline-subtle pl-2">
                <TreeEntriesList nodes={node.children} searching={searching} />
              </div>
            </details>
          ) : (
            <div title={node.path} className="ui-tree-file">
              <div className="flex min-w-0 items-center gap-2">
                <FileCode2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-secondary" />
                <span className="truncate">{node.name}</span>
              </div>
              {node.size !== undefined && (
                <span className="shrink-0 text-[10px] text-on-subtle">
                  {(node.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const TreeEntries = memo(TreeEntriesList);

export const RepoFileTree = memo(function RepoFileTree({
  files,
  search,
}: {
  files: RepoBundle["fileTree"];
  search: string;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const deferredSearch = useDeferredValue(normalizedSearch);
  const isStale = normalizedSearch !== deferredSearch;
  const { roots, query } = useMemo(
    () => buildRepoFileTree(files, deferredSearch),
    [files, deferredSearch],
  );

  return (
    <div
      aria-busy={isStale || undefined}
      className={cn("transition-opacity", isStale && "opacity-60")}
    >
      <TreeEntries key={query} nodes={roots} searching={Boolean(query)} />
    </div>
  );
});
