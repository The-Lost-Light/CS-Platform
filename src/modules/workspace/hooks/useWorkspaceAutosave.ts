import { useEffect, useEffectEvent, useState } from "react";

import { emptyModel, type WorkspaceSnapshot } from "../model/personalWorkspace";
import { createSaveQueue, type SaveStatus } from "../services/saveQueue";
import { saveDraft } from "../services/workspaceApi";

export function useWorkspaceAutosave(
  projectId: string,
  snapshot: WorkspaceSnapshot,
  enabled: boolean,
  onSaved: (revision: string, updatedAt: number) => void,
  onDeadlineLocked?: () => void,
) {
  const [status, setStatus] = useState<SaveStatus>(
    snapshot.revision ? "draft.saved" : "draft.empty",
  );
  const notifyDeadlineLocked = useEffectEvent(() => onDeadlineLocked?.());
  useEffect(() => {
    if (status === "draft.deadlinePassed") notifyDeadlineLocked();
  }, [status]);
  const [queue] = useState(() =>
    createSaveQueue(
      snapshot.draft ?? { designDoc: "", model: emptyModel(), repoUrl: "" },
      snapshot.revision,
      (revision, batch) => saveDraft(projectId, snapshot.accountId, revision, batch),
      onSaved,
      setStatus,
    ),
  );
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, queue]);
  return { status, update: enabled ? queue.update : undefined };
}
