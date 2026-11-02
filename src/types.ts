import type { BasicAssignment, AdvancedProject, MindMapNode } from './data/assignmentsData';
import type { ChangeRecord, summarizeChangeRecords } from './utils/changeTracker';
import type { analyzeArchitectureAlignment } from './utils/architectureAnalyzer';
export type { BasicAssignment, AdvancedProject, MindMapNode, ChangeRecord };
export type ChangeStats = ReturnType<typeof summarizeChangeRecords>;
export type Analysis = ReturnType<typeof analyzeArchitectureAlignment>;
export interface User { studentId: string; name: string; role: string }
export type RepoSnapshot = typeof import('./utils/githubService').BUILTIN_REPO_SNAPSHOTS['student-team/course-oj-platform'];
export interface RepoBundle {
 repo: RepoSnapshot['repo']; languages: Record<string, number>;
 branches: RepoSnapshot['branches'];
 commits: RepoSnapshot['commits'];
 fileTree: RepoSnapshot['fileTree'];
 sourceType: string; rateLimit: string; apiError?: string;
}
