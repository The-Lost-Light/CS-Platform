import type { C4Node, C4Relationship } from "@modules/c4-model";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import type { PersonalWorkspace } from "../model/personalWorkspace";
import { createSaveQueue, type SaveStatus } from "../services/saveQueue";
import { saveDraft } from "../services/workspaceApi";

export interface AutosaveOptions {
  projectId: string;
  accountId: string;
  revision: string | null;
  onSaved: (revision: string, updatedAt: number) => void;
  onDeadlineLocked?: () => void;
  designDoc: string;
  nodes: C4Node[];
  relationships: C4Relationship[];
  repoUrl: string;
}

export function useWorkspaceAutosave({
  projectId,
  accountId,
  revision,
  onSaved,
  onDeadlineLocked,
  designDoc,
  nodes,
  relationships,
  repoUrl,
}: AutosaveOptions) {
  const draft = useMemo<PersonalWorkspace>(
    () => ({
      designDoc,
      model: { format: "codepulse-c4", version: 1, nodes, relationships },
      repoUrl: repoUrl.trim(),
    }),
    [designDoc, nodes, relationships, repoUrl],
  );
  const [status, setStatus] = useState<SaveStatus>(revision ? "draft.saved" : "draft.empty");
  const notifyDeadlineLocked = useEffectEvent(() => {
    onDeadlineLocked?.();
  });
  useEffect(() => {
    if (status === "draft.deadlinePassed") notifyDeadlineLocked();
  }, [status]);
  const [queue] = useState(() =>
    createSaveQueue(
      draft,
      revision,
      (version, next) => saveDraft(projectId, accountId, version, next),
      onSaved,
      setStatus,
    ),
  );
  useEffect(() => {
    const unmount = queue.mount();
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") void queue.flush();
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (queue.hasPendingChanges()) {
        event.preventDefault();
        event.returnValue = true;
        void queue.flush();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", beforeUnload);
      unmount();
    };
  }, [queue]);
  useEffect(() => queue.update(draft), [queue, draft]);
  return status;
}
