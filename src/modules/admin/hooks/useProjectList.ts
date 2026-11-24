import { useProjectCatalog } from "@modules/catalog";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { useState } from "react";

export function useProjectList() {
  const { locale } = useI18n();
  const { projects, removeProject, replaceProjects } = useProjectCatalog();
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<Project | "updated" | null>(null);
  const [search, setSearch] = useState("");
  const canReorder = search.trim() === "" && !pending && !deleting && projects.length > 1;
  async function remove() {
    if (!deleting || pending) return;
    setPending(true);
    setError(false);
    setSaved(null);
    try {
      const response = await fetch(`/api/projects/${deleting.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error("Delete failed");
      removeProject(deleting.id);
      setDeleting(null);
      setSaved("updated");
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
    setSaved(null);
    try {
      const response = await fetch(`/api/projects?locale=${encodeURIComponent(locale)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!response.ok) throw new Error("Reorder failed");
      const data = (await response.json()) as { projects: Project[] };
      replaceProjects(data.projects);
      setSaved("updated");
    } catch {
      replaceProjects(previous);
      setError(true);
    } finally {
      setPending(false);
    }
  }
  const visible = projects.filter((project) =>
    `${project.index} ${project.title}`.toLowerCase().includes(search.toLowerCase()),
  );
  return {
    count: projects.length,
    visible,
    search,
    setSearch,
    saved,
    pending,
    editing,
    deleting,
    error,
    canReorder,
    remove,
    reorder,
    edit: (project: Project) => {
      setEditing(project);
      setSaved(null);
      setError(false);
    },
    requestDelete: (project: Project) => {
      setDeleting(project);
      setSaved(null);
      setError(false);
    },
    cancelEdit: () => setEditing(null),
    finishCreate: (project: Project) => setSaved(project),
    finishEdit: () => {
      setEditing(null);
      setSaved("updated");
    },
    cancelDelete: () => setDeleting(null),
  };
}
