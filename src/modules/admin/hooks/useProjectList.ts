import { useProjectCatalog } from "@modules/catalog";
import type { Project } from "@modules/projects";
import { useEffect, useState } from "react";

const REORDER_SAVED_DURATION_MS = 3500;

export function useProjectList(initialReorderSaved = false) {
  const { projects, removeProject, replaceProjects } = useProjectCatalog();
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<Project | "updated" | null>(null);
  const [reorderNotice, setReorderNotice] = useState<{ id: number } | null>(
    initialReorderSaved ? { id: 1 } : null,
  );
  const reorderSaved = reorderNotice !== null;
  const showReorderSaved = () => {
    setReorderNotice((previous) => ({ id: (previous?.id ?? 0) + 1 }));
  };
  const clearReorderSaved = () => setReorderNotice(null);
  useEffect(() => {
    if (!reorderNotice) return;
    const timer = setTimeout(() => {
      setReorderNotice((current) => (current?.id === reorderNotice.id ? null : current));
    }, REORDER_SAVED_DURATION_MS);
    return () => clearTimeout(timer);
  }, [reorderNotice]);
  const [search, setSearch] = useState("");
  const canReorder = search.trim() === "" && !pending && !deleting && projects.length > 1;
  async function remove() {
    if (!deleting || pending) return;
    setPending(true);
    setError(false);
    setSaved(null);
    clearReorderSaved();
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
    clearReorderSaved();
    try {
      const response = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!response.ok) throw new Error("Reorder failed");
      const data = (await response.json()) as { projects: Project[] };
      replaceProjects(data.projects);
      showReorderSaved();
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
    reorderSaved,
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
      clearReorderSaved();
      setError(false);
    },
    requestDelete: (project: Project) => {
      setDeleting(project);
      setSaved(null);
      clearReorderSaved();
      setError(false);
    },
    cancelEdit: () => setEditing(null),
    finishCreate: (project: Project) => {
      clearReorderSaved();
      setSaved(project);
    },
    finishEdit: () => {
      setEditing(null);
      clearReorderSaved();
      setSaved("updated");
    },
    cancelDelete: () => setDeleting(null),
  };
}
