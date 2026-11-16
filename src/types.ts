import type { MindMapNode, Project } from "./data/assignmentsData";
import type { analyzeArchitectureAlignment } from "./utils/architectureAnalyzer";
export type { MindMapNode, Project };
export type Analysis = ReturnType<typeof analyzeArchitectureAlignment>;
export type { User } from './auth/types';
export type RepoSnapshot =
  (typeof import("./utils/githubService").BUILTIN_REPO_SNAPSHOTS)["student-team/course-oj-platform"];
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
