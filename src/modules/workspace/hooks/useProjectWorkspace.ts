import type { Project } from "@modules/projects";
import type { WorkspaceSnapshot } from "../model/personalWorkspace";
import { useProjectDraft } from "./useProjectDraft";
import {
  useRepository,
  fetchGitHubProjectBundle,
  type GitHubProjectLoader,
} from "@modules/repository";
import { useEffect, useState } from "react";

export function useProjectWorkspace(
  project: Project,
  snapshot: WorkspaceSnapshot,
  loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle,
) {
  const [revision, setRevision] = useState(snapshot.revision);
  const initialRepoUrl = snapshot.draft?.repoUrl ?? project.defaultRepoUrl;
  const repository = useRepository(initialRepoUrl, loadRepository);
  const draft = useProjectDraft(project, snapshot.draft, revision === null);
  useEffect(() => {
    if (initialRepoUrl) void repository.handleLoadRepo(initialRepoUrl);
  }, []);
  const [activeTab, setActiveTab] = useState<"design" | "github">("design");
  return { repository, draft, revision, setRevision, activeTab, setActiveTab };
}
