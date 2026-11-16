import type { MindMapNode, Project } from "./data/projectsData";
export type { MindMapNode, Project };
export type { User } from './auth/types';
type SnapshotData =
  (typeof import("./data/builtinRepoSnapshots.json"))["student-team/course-oj-platform"];
type SnapshotCommit = SnapshotData["commits"][number];
// JSON widens string literals; retain the translation-key constraint for consumers.
export type RepoSnapshot = Omit<SnapshotData, "commits"> & {
  commits: Array<Omit<SnapshotCommit, "prInfo"> & {
    prInfo: Omit<SnapshotCommit["prInfo"], "merge_method_key"> & {
      merge_method_key: Extract<import("./i18n/messages").MessageKey, `github.merge.${string}`>;
    };
  }>;
};
export interface RepoBundle {
  repo: RepoSnapshot["repo"];
  languages: Record<string, number>;
  branches: RepoSnapshot["branches"];
  commits: RepoSnapshot["commits"];
  fileTree: RepoSnapshot["fileTree"];
  sourceType: string;
  rateLimit: string;
  apiError?: string;
}
