import type { Project } from "@domain/project";
import type { WorkspaceSnapshot } from "@domain/personalWorkspace";
import { useProjectDraft } from "@hooks/useProjectDraft";
import { useRepository } from "@hooks/useRepository";
import { fetchGitHubProjectBundle, type GitHubProjectLoader } from "@services/github";
import { useEffect, useState } from "react";

/** Compose draft and repository lifecycles without coupling either hook to a page. */
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
  return { ...repository, ...draft, revision, setRevision, activeTab, setActiveTab };
}
