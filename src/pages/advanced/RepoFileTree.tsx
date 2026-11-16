import { ChevronRight, FileCode2, Folder } from 'lucide-react';
import type { RepoBundle } from '../../types';

import { buildRepoFileTree, type TreeNode } from '../../utils/repoFileTree';

function TreeEntries({ nodes, searching }: { nodes: Map<string, TreeNode>; searching: boolean }) {
  const sorted = [...nodes.values()].sort((a, b) =>
    Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name)
  );

  return (
    <ul className="space-y-1">
      {sorted.map(node => (
        <li key={node.path}>
          {node.directory ? (
            <details open={searching || undefined} className="group/folder">
              <summary
                title={node.path}
                className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 text-on-surface hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open/folder:rotate-90" />
                <Folder className="h-3.5 w-3.5 shrink-0 text-success" />
                <span className="truncate">{node.name}</span>
              </summary>
              <div className="ml-3 border-l border-outline pl-2">
                <TreeEntries nodes={node.children} searching={searching} />
              </div>
            </details>
          ) : (
            <div title={node.path} className="flex items-center justify-between gap-2 rounded-lg py-2 pl-7 pr-2 text-on-surface hover:bg-surface-hover">
              <div className="flex min-w-0 items-center gap-2">
                <FileCode2 className="h-3.5 w-3.5 shrink-0 text-secondary" />
                <span className="truncate">{node.name}</span>
              </div>
              {node.size !== undefined && (
                <span className="shrink-0 text-[10px] text-on-subtle">{(node.size / 1024).toFixed(1)} KB</span>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function RepoFileTree({ files, search }: { files: RepoBundle['fileTree']; search: string }) {
  const { roots, query } = buildRepoFileTree(files, search);

  return <TreeEntries key={query} nodes={roots} searching={Boolean(query)} />;
}
