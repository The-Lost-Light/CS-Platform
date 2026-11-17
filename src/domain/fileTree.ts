import type { RepoBundle } from '@domain/repository';

export interface TreeNode {
  name: string;
  path: string;
  directory: boolean;
  size?: number;
  children: Map<string, TreeNode>;
}

export function buildRepoFileTree(files: RepoBundle['fileTree'], search: string) {
  const query = search.trim().toLowerCase();
  const roots = new Map<string, TreeNode>();

  for (const file of files) {
    if (!file.path.toLowerCase().includes(query)) continue;
    const parts = file.path.split('/').filter(Boolean);
    let siblings = roots;
    parts.forEach((name, index) => {
      const directory = index < parts.length - 1 || file.type === 'tree';
      let node = siblings.get(name);
      if (!node) {
        node = { name, path: parts.slice(0, index + 1).join('/'), directory, children: new Map() };
        siblings.set(name, node);
      }
      node.directory ||= directory;
      if (!directory) node.size = file.size;
      siblings = node.children;
    });
  }

  return { roots, query };
}
