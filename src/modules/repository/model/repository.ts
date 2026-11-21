interface Repository {
  full_name: string;
  html_url: string;
  description: string;
  private: boolean;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  language: string;
  updated_at: string;
  homepage: string;
  license: {
    spdx_id: string;
    name: string;
  };
  topics: Array<string>;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface RepoBranch {
  name: string;
  protected: boolean;
  commit: {
    sha: string;
  };
}

interface RepoTag {
  name: string;
  commit: {
    sha: string;
  };
}

interface RepoPullRequest {
  number: number;
  title?: string;
  state?: string;
}

export interface RepoCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  };
  committer: {
    login: string;
    avatar_url: string;
  };
  parents: Array<{
    sha: string;
  }>;
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  diffError?: boolean;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export type RepoCommitDetails = Pick<RepoCommit, "sha" | "stats" | "files" | "diffError">;

export interface RepoCommitsPage {
  commits: RepoCommit[];
  hasMore: boolean;
}

interface RepoFile {
  path: string;
  type: string;
  size: number;
}

export interface RepoBranchesPage {
  branches: RepoBranch[];
  hasMore: boolean;
}

export interface RepoBranchSnapshot {
  selectedBranch: string;
  commits: RepoCommit[];
  totalCommits: number;
  fileTree: RepoFile[];
  rateLimit?: string;
}

export interface RepoBundle {
  repo: Repository;
  selectedBranch: string;
  languages: Record<string, number>;
  branches: RepoBranch[];
  totalBranches?: number;
  hasMoreBranches?: boolean;
  tags?: RepoTag[];
  totalTags?: number;
  pulls?: RepoPullRequest[];
  totalPulls?: number;
  openIssuesCount?: number;
  commits: RepoCommit[];
  totalCommits?: number;
  fileTree: RepoFile[];

  sourceType: "live-api";
  rateLimit: string;
}
