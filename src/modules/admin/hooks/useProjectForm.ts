import { useState, type FormEvent } from "react";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { useProjectCatalog } from "@modules/catalog";

export function useProjectForm(original?: Project, onSaved?: () => void) {
  const { locale } = useI18n();
  const { addProject } = useProjectCatalog();
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<Project | null>(null);
  const [error, setError] = useState<"duplicate" | "invalid" | "failed" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = { ...Object.fromEntries(data), points: Number(data.get("points")) };
    setPending(true);
    setError(null);
    setCreated(null);
    try {
      const response = await fetch(
        original ? `/api/projects/${original.id}?locale=${locale}` : "/api/projects",
        {
          method: original ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        setError(
          response.status === 409 ? "duplicate" : response.status === 400 ? "invalid" : "failed",
        );
        return;
      }
      const { project } = (await response.json()) as { project: Project };
      addProject(project);
      setCreated(project);
      if (!original) form.reset();
      onSaved?.();
    } catch {
      setError("failed");
    } finally {
      setPending(false);
    }
  }
  return { pending, created, error, submit };
}
