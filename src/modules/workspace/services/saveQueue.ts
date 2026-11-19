import type { PersonalWorkspace } from "../model/personalWorkspace";
import type { SaveError, SaveResult } from "./workspaceApi";

export type SaveStatus =
  | SaveError
  | "draft.saved"
  | "draft.empty"
  | "draft.saving"
  | "draft.unsaved";

const AUTOSAVE_DELAY_MS = 1000;

// A page may unmount while a write is in flight. Each subsequent write must use the last accepted revision.
export function createSaveQueue(
  draft: PersonalWorkspace,
  revision: string | null,
  write: (revision: string | null, draft: PersonalWorkspace) => Promise<SaveResult>,
  onSaved: (revision: string) => void,
  setStatus: (status: SaveStatus) => void,
) {
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
      const result = await write(version, writing);
      if (!result.ok) {
        blocked = result.error === "draft.conflict" || result.error === "draft.session";
        if (mounted) setStatus(result.error);
        if (mounted && result.retry) schedule(5000);
        return;
      }
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
      if (!blocked && latest !== writing) schedule(mounted ? AUTOSAVE_DELAY_MS : 0);
    }
  }
  return {
    flush,
    hasPendingChanges: () => saved !== latest,
    mount() {
      mounted = true;
      return () => {
        mounted = false;
        void flush();
      };
    },
    update(next: PersonalWorkspace) {
      if (latest === next || blocked) return;
      latest = next;
      setStatus("draft.unsaved");
      schedule(AUTOSAVE_DELAY_MS);
    },
  };
}
