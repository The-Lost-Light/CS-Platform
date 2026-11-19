import { useProjectCatalog } from "@modules/catalog";
import type { Project } from "@modules/projects";
import { useState } from "react";

export function useProjectList() {
  const { projects, removeProject } = useProjectCatalog();
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<Project | "updated" | null>(null);
  const [search, setSearch] = useState("");
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
  const visible = projects.filter((project) =>
    `${project.codeName} ${project.title}`.toLowerCase().includes(search.toLowerCase()),
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
    remove,
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
