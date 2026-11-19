import { useProjectCatalog } from "@modules/catalog";
import { useI18n } from "@modules/i18n";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  type Project,
  type ProjectAttachment,
} from "@modules/projects";
import { useState, type FormEvent } from "react";

export function useProjectForm(original: Project | undefined, onSaved: (project: Project) => void) {
  const { locale } = useI18n();
  const { addProject } = useProjectCatalog();
  const [attachments, setAttachments] = useState<(ProjectAttachment | File)[]>(
    original?.attachments ?? [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"duplicate" | "invalid" | "failed" | "attachments" | null>(
    null,
  );
  function addFiles(files: File[]) {
    const next = [...attachments, ...files];
    if (
      next.length > MAX_ATTACHMENTS ||
      next.reduce((sum, file) => sum + file.size, 0) > MAX_ATTACHMENT_BYTES
    ) {
      setError("attachments");
      return;
    }
    setAttachments(next);
    setError(null);
  }
  function removeFile(index: number) {
    setAttachments(attachments.filter((_, i) => i !== index));
    setError(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    data.delete("attachments");
    for (const file of attachments) data.append("attachments", "id" in file ? file.id : file);
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        original ? `/api/projects/${original.id}?locale=${locale}` : "/api/projects",
        {
          method: original ? "PATCH" : "POST",
          body: data,
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
      onSaved(project);
    } catch {
      setError("failed");
    } finally {
      setPending(false);
    }
  }
  return { pending, error, submit, attachments, addFiles, removeFile };
}
