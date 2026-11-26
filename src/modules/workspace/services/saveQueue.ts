import {
  MAX_EDITS_PER_SAVE,
  type PersonalWorkspace,
  type PendingEdit,
  type SaveBatch,
} from "../model/personalWorkspace";
import type { SaveError, SaveResult } from "./workspaceApi";

export type SaveStatus =
  | SaveError
  | "draft.saved"
  | "draft.empty"
  | "draft.saving"
  | "draft.unsaved";

export function createSaveQueue(
  initial: PersonalWorkspace,
  revision: string | null,
  write: (revision: string | null, batch: SaveBatch) => Promise<SaveResult>,
  onSaved: (revision: string, updatedAt: number) => void,
  setStatus: (status: SaveStatus) => void,
) {
  let latest = initial;
  let version = revision;
  const pending: PendingEdit[] = [];
  let batch: SaveBatch | undefined;
  let batchLimit = MAX_EDITS_PER_SAVE;
  let busy = false;
  let blocked = false;
  let rejected = false;
  let mounted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function schedule(delay: number) {
    if (!timer) timer = setTimeout(() => void flush(), delay);
  }
  async function flush() {
    clearTimeout(timer);
    timer = undefined;
    if (busy || blocked || rejected || !pending.length) return;
    busy = true;
    batch ??= { writeId: crypto.randomUUID(), edits: pending.slice(0, batchLimit) };
    if (mounted) setStatus("draft.saving");
    try {
      const result = await write(version, batch);
      if (!result.ok) {
        const invalid = result.error === "draft.tooLarge" || result.invalidContent;
        if (invalid && batch.edits.length > 1) {
          batchLimit = Math.ceil(batch.edits.length / 2);
          batch = undefined;
          schedule(0);
          return;
        }
        if (mounted) setStatus(result.error);
        if (invalid) {
          batch = undefined;
          // A rejected state cannot be committed. Let the next correction save normally.
          if (pending.length > 1) {
            pending.shift();
            schedule(0);
          } else rejected = true;
        } else if (result.retry) {
          if (mounted) schedule(5000);
        } else {
          blocked = true;
        }
        return;
      }
      pending.splice(0, batch.edits.length);
      batch = undefined;
      batchLimit = MAX_EDITS_PER_SAVE;
      version = result.revision;
      if (mounted) {
        onSaved(version, result.updatedAt);
        setStatus(pending.length ? "draft.unsaved" : "draft.saved");
      }
      if (pending.length) schedule(0);
    } catch {
      if (mounted) {
        setStatus("draft.saveError");
        schedule(5000);
      }
    } finally {
      busy = false;
    }
  }
  return {
    flush,
    hasPendingChanges: () => pending.length > 0,
    mount() {
      mounted = true;
      return () => {
        mounted = false;
        void flush();
      };
    },
    update(this: void, change: Partial<PersonalWorkspace>) {
      if (blocked) return;
      const next = { ...latest, ...change };
      if (
        latest.designDoc === next.designDoc &&
        latest.model === next.model &&
        latest.repoUrl === next.repoUrl
      )
        return;
      latest = next;
      if (rejected) {
        pending.shift();
        rejected = false;
      }
      pending.push({ draft: next, editedAt: Date.now() });
      if (mounted) setStatus("draft.unsaved");
      if (!busy) schedule(1000);
    },
  };
}
