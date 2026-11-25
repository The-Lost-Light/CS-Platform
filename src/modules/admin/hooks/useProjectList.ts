import { useProjectCatalog } from "@modules/catalog";
import type { Project } from "@modules/projects";
import { useState } from "react";

import { useManagementDialogs } from "./useManagementDialogs";

export type ProjectListNotice = "admin.projects.success" | "admin.saved";

export function useProjectList(initialNotice: ProjectListNotice | null = null) {
  const { projects, removeProject, replaceProjects } = useProjectCatalog();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const dialogs = useManagementDialogs<Project, ProjectListNotice>({
    initialNotice,
    onClearError: () => setError(false),
  });
  const canReorder =
    dialogs.search.trim() === "" && !pending && !dialogs.deleting && projects.length > 1;

  async function remove() {
    if (!dialogs.deleting || pending) return;
    setPending(true);
    setError(false);
    dialogs.clearNotice();
    try {
      const response = await fetch(`/api/projects/${dialogs.deleting.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error("Delete failed");
      removeProject(dialogs.deleting.id);
      dialogs.completeDelete("admin.saved");
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function reorder(orderedIds: string[]) {
    if (!canReorder || orderedIds.length !== projects.length) return;
    if (orderedIds.every((id, index) => projects[index]?.id === id)) return;
    const byId = new Map(projects.map((project) => [project.id, project]));
    const reordered = orderedIds.flatMap((id, index) => {
      const item = byId.get(id);
      return item ? [{ ...item, index: index + 1 }] : [];
    });
    if (reordered.length !== projects.length) return;
    const previous = projects;
    replaceProjects(reordered);
    setPending(true);
    setError(false);
    dialogs.clearNotice();
    try {
      const response = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!response.ok) throw new Error("Reorder failed");
      const data = (await response.json()) as { projects: Project[] };
      replaceProjects(data.projects);
      dialogs.showNotice("admin.saved");
    } catch {
      replaceProjects(previous);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  const visible = projects.filter((project) =>
    `${project.index} ${project.title}`.toLowerCase().includes(dialogs.search.toLowerCase()),
  );

  return {
    count: projects.length,
    visible,
    search: dialogs.search,
    setSearch: dialogs.setSearch,
    notice: dialogs.notice,
    pending,
    creating: dialogs.creating,
    editing: dialogs.editing,
    deleting: dialogs.deleting,
    error,
    canReorder,
    remove,
    reorder,
    openCreate: dialogs.openCreate,
    cancelCreate: dialogs.cancelCreate,
    finishCreate: () => dialogs.finishCreate("admin.projects.success"),
    edit: dialogs.edit,
    cancelEdit: dialogs.cancelEdit,
    finishEdit: () => dialogs.finishEdit("admin.saved"),
    requestDelete: dialogs.requestDelete,
    cancelDelete: dialogs.cancelDelete,
    resetDialogs: dialogs.resetDialogs,
  };
}
