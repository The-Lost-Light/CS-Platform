import type { Project } from "@domain/project";
import { useProjectDraft } from "@hooks/useProjectDraft";
import { useRepository } from "@hooks/useRepository";
import { fetchGitHubProjectBundle, type GitHubProjectLoader } from "@services/github";
import { useState } from "react";

/** Compose draft and repository lifecycles without coupling either hook to a page. */
export function useProjectWorkspace(
  project: Project,
  loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle,
) {
  const repository = useRepository(project.defaultRepoUrl, loadRepository);
  const draft = useProjectDraft(project, (url) => {
    repository.resetRepository(url);
    if (url) void repository.handleLoadRepo(url);
  });
  const [activeTab, setActiveTab] = useState<"design" | "github">("design");
  return { ...repository, ...draft, activeTab, setActiveTab };
}
