import { useEffect, useRef, useState } from "react";
import { updateLocalizedProjectDraft } from "../data/localizedAssignments";
import { isMessageKey, type MessageKey } from "../i18n/messages";
import type { Project, RepoBundle } from "../types";
import { migrateC4Nodes, type C4Relationship } from "../utils/c4Model";
import { fetchGitHubProjectBundle } from "../utils/githubService";

export function useProjectWorkspace(project: Project) {
  const [repoUrlInput, setRepoUrlInput] = useState(
    project.defaultRepoUrl ||
      "https://github.com/student-team/course-oj-platform",
  );
  const [githubToken, setGithubToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [mindMapNodes, setMindMapNodes] = useState(() =>
    migrateC4Nodes(project.initialMindMapNodes || []),
  );
  const [relationships, setRelationships] = useState<C4Relationship[]>([]);
  const [designDoc, setDesignDoc] = useState(project.initialDesignDoc || "");
  const [repoBundle, setRepoBundle] = useState<RepoBundle | null>(null);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState<
    { key: MessageKey } | { message: string } | null
  >(null);
  const previousProject = useRef(project);
  const [activeTab, setActiveTab] = useState<"design" | "github">("design");

  useEffect(() => {
    const previous = previousProject.current;
    previousProject.current = project;
    if (previous.id === project.id && previous !== project) {
      setMindMapNodes((nodes) => {
        const localized = updateLocalizedProjectDraft(
          nodes,
          "",
          previous,
          project,
        ).nodes;
        return nodes.map((node, index) => ({ ...node, ...localized[index] }));
      });
      setDesignDoc(
        (doc) =>
          updateLocalizedProjectDraft([], doc, previous, project).designDoc,
      );
      return;
    }
    setRepoUrlInput(project.defaultRepoUrl);
    setMindMapNodes(migrateC4Nodes(project.initialMindMapNodes || []));
    setRelationships([]);
    setDesignDoc(project.initialDesignDoc || "");
    handleLoadRepo(project.defaultRepoUrl);
  }, [project]);

  const handleLoadRepo = async (targetUrl = repoUrlInput) => {
    setIsLoadingRepo(true);
    setRepoError(null);
    try {
      const bundle = await fetchGitHubProjectBundle(targetUrl, githubToken);
      setRepoBundle(bundle);
    } catch (err) {
      setRepoError(
        err instanceof Error
          ? isMessageKey(err.message)
            ? { key: err.message }
            : { message: err.message }
          : { key: "workspace.errors.syncFailed" },
      );
    } finally {
      setIsLoadingRepo(false);
    }
  };

  return {
    repoUrlInput,
    setRepoUrlInput,
    githubToken,
    setGithubToken,
    showTokenInput,
    setShowTokenInput,
    mindMapNodes,
    setMindMapNodes,
    relationships,
    setRelationships,
    designDoc,
    setDesignDoc,
    repoBundle,
    isLoadingRepo,
    repoError,
    activeTab,
    setActiveTab,
    handleLoadRepo,
  };
}
