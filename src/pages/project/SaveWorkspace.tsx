import { useEffect, useMemo, useState } from "react";

import type { C4Node, C4Relationship } from "@domain/c4";
import type { PersonalWorkspace } from "@domain/personalWorkspace";
import { useI18n } from "@i18n";

type SaveError =
  | "draft.conflict"
  | "draft.invalidRepo"
  | "draft.tooLarge"
  | "draft.session"
  | "draft.saveError";
interface Props {
  projectId: string;
  accountId: string;
  revision: string | null;
  onSaved: (revision: string) => void;
  designDoc: string;
  nodes: C4Node[];
  relationships: C4Relationship[];
  repoUrl: string;
}

export function SaveWorkspace({
  projectId,
  accountId,
  revision,
  onSaved,
  designDoc,
  nodes,
  relationships,
  repoUrl,
}: Props) {
  const { t } = useI18n();
  const draft = useMemo<PersonalWorkspace>(
    () => ({
      designDoc,
      model: { format: "codepulse-c4", version: 1, nodes, relationships },
      repoUrl: repoUrl.trim(),
    }),
    [designDoc, nodes, relationships, repoUrl],
  );
  const [status, setStatus] = useState<
    SaveError | "draft.saved" | "draft.template" | "draft.saving" | "draft.unsaved"
  >(revision ? "draft.saved" : "draft.template");
  // The page remounts for each account/project. Keep writes serialized even
  // when the user leaves while the previous revision is still being saved.
  const [queue] = useState(() => {
    let latest = draft;
    let saved = draft;
    let version = revision;
    let mounted = false;
    let busy = false;
    let blocked = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule(delay: number) {
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), delay);
    }
    async function flush() {
      clearTimeout(timer);
      if (busy || blocked || saved === latest) return;
      busy = true;
      const writing = latest;
      if (mounted) setStatus("draft.saving");
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/workspace`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Workspace-Account": accountId },
          body: JSON.stringify({ revision: version, draft: writing }),
        });
        if (!response.ok) {
          let error: SaveError = "draft.saveError";
          if (response.status === 409) error = "draft.conflict";
          else if (response.status === 401 || response.status === 403) error = "draft.session";
          else if (response.status === 413) error = "draft.tooLarge";
          else if (response.status === 400 && (await response.json()).error === "repo")
            error = "draft.invalidRepo";
          blocked = error === "draft.conflict" || error === "draft.session";
          if (mounted) setStatus(error);
          if (mounted && response.status >= 500) schedule(5000);
          return;
        }
        const result: { revision: string } = await response.json();
        version = result.revision;
        saved = writing;
        if (mounted) {
          onSaved(result.revision);
          setStatus(latest === saved ? "draft.saved" : "draft.unsaved");
        }
      } catch {
        if (mounted) {
          setStatus("draft.saveError");
          schedule(5000);
        }
      } finally {
        busy = false;
        if (!blocked && latest !== writing) schedule(mounted ? 750 : 0);
      }
    }
    return {
      mount() {
        mounted = true;
        function onVisibilityChange() {
          if (document.visibilityState === "hidden") void flush();
        }
        function beforeUnload(event: BeforeUnloadEvent) {
          if (saved !== latest) {
            event.preventDefault();
            event.returnValue = true;
            void flush();
          }
        }
        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("beforeunload", beforeUnload);
        return () => {
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.removeEventListener("beforeunload", beforeUnload);
          mounted = false;
          void flush();
        };
      },
      update(next: PersonalWorkspace) {
        if (latest === next || blocked) return;
        latest = next;
        setStatus("draft.unsaved");
        schedule(750);
      },
    };
  });
  useEffect(() => queue.mount(), [queue]);
  useEffect(() => queue.update(draft), [queue, draft]);
  const neutral =
    status === "draft.template" || status === "draft.unsaved" || status === "draft.saving";
  const color = neutral
    ? "bg-surface-sunken border-outline text-on-muted"
    : status === "draft.saved"
      ? "bg-success-container border-success-outline text-on-success-container"
      : "bg-danger-container border-danger-outline text-on-danger-container";
  return (
    <div
      role={neutral || status === "draft.saved" ? "status" : "alert"}
      className={`max-w-sm px-3.5 py-2 rounded-xl text-xs font-semibold border ${color}`}
    >
      {t(status)}
    </div>
  );
}
