import {
  useRepository,
  fetchGitHubProjectBundle,
  type GitHubProjectLoader,
} from "@modules/repository";
import { useEffect, useState } from "react";

import type { WorkspaceSnapshot } from "../model/personalWorkspace";
import { useProjectDraft } from "./useProjectDraft";

export function useProjectWorkspace(
  snapshot: WorkspaceSnapshot,
  loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle,
) {
  const [revision, setRevision] = useState(snapshot.revision);
  const initialRepoUrl = snapshot.draft?.repoUrl ?? "";
  const repository = useRepository(initialRepoUrl, loadRepository);
  const draft = useProjectDraft(snapshot.draft);
  useEffect(() => {
    if (initialRepoUrl) void repository.handleLoadRepo(initialRepoUrl);
  }, []);
  const [activeTab, setActiveTab] = useState<"assignment" | "design" | "github">("assignment");
  return { repository, draft, revision, setRevision, activeTab, setActiveTab };
}
