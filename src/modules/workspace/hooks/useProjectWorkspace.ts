import type { DesignTab } from "@modules/c4-editor";
import {
  useRepository,
  fetchGitHubProjectBundle,
  type GitHubProjectLoader,
} from "@modules/repository";
import { useEffect, useState } from "react";

import type { WorkspaceSnapshot, PersonalWorkspace } from "../model/personalWorkspace";
import { useProjectDraft } from "./useProjectDraft";

export type WorkspaceTab = "assignment" | "design" | "github";

export function useProjectWorkspace(
  snapshot: WorkspaceSnapshot,
  loadRepository: GitHubProjectLoader = fetchGitHubProjectBundle,
  initialActiveTab: WorkspaceTab = "assignment",
  initialDesignTab: DesignTab = "readme",
  record?: (change: Partial<PersonalWorkspace>) => void,
) {
  const initialRepoUrl = snapshot.draft?.repoUrl ?? "";
  const repository = useRepository(initialRepoUrl, loadRepository);
  const draft = useProjectDraft(snapshot.draft, record);
  useEffect(() => {
    record?.({ repoUrl: repository.repoUrl.trim() });
  }, [record, repository.repoUrl]);
  useEffect(() => {
    if (initialRepoUrl) void repository.handleLoadRepo(initialRepoUrl);
  }, []);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialActiveTab);
  const [designTab, setDesignTab] = useState<DesignTab>(initialDesignTab);
  return {
    repository,
    draft,
    activeTab,
    setActiveTab,
    designTab,
    setDesignTab,
  };
}
