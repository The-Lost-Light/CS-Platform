import type { MessageKey } from "@modules/i18n";

export interface Repository {
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

export interface RepoTag {
  name: string;
  commit: {
    sha: string;
  };
}

export interface RepoPullRequest {
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
  prInfo?: {
    number: number;
    title: string;
    html_url: string;
    state: string;
    merge_method: string;
    merge_method_key: Extract<MessageKey, `github.merge.${string}`>;
    merged_by: {
      login: string;
      name: string;
    };
    merged_at: string;
    base_ref: string;
    head_ref: string;
  };
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

export interface RepoFile {
  path: string;
  type: string;
  size: number;
}

export interface RepoBundle {
  repo: Repository;
  selectedBranch: string;
  languages: Record<string, number>;
  branches: RepoBranch[];
  tags?: RepoTag[];
  pulls?: RepoPullRequest[];
  commits: RepoCommit[];
  fileTree: RepoFile[];

  sourceType: "live-api";
  rateLimit: string;
}
