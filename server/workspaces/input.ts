import { validateC4File, C4_FILE_MAX_BYTES } from "@modules/c4-model";
import { MAX_EDITS_PER_SAVE, type DesignEdit, type PersonalWorkspace } from "@modules/workspace";
import { isValidWorkspaceRepoUrl } from "@shared/githubRepoUrl";
import { readLimitedJson } from "@shared/http/readLimitedText";
import { isRecord } from "@shared/isRecord";
import { isValidDesignDoc } from "@shared/workspacePolicy";

type WorkspaceInput =
  | {
      ok: true;
      draft: PersonalWorkspace;
      previous: string | null;
      edits: DesignEdit[];
      writeId?: string;
    }
  | { ok: false; error: "tooLarge" | "invalid" | "repo" };

export async function readWorkspaceInput(request: Request): Promise<WorkspaceInput> {
  const parsed = await readLimitedJson(request, C4_FILE_MAX_BYTES + 1024 * 1024);
  if (!parsed.ok) return parsed;
  const body = parsed.value;
  if (!isRecord(body) || !isRecord(body.draft)) return { ok: false, error: "invalid" };
  const previous = body.revision;
  if (previous !== null && (typeof previous !== "string" || previous.length !== 36))
    return { ok: false, error: "invalid" };
  const { designDoc, repoUrl, model } = body.draft;
  if (!isValidDesignDoc(designDoc) || typeof repoUrl !== "string")
    return { ok: false, error: "invalid" };
  // Accept the URL and owner/repository formats used by the GitHub panel.
  if (!isValidWorkspaceRepoUrl(repoUrl)) return { ok: false, error: "repo" };
  const { earlier = [], writeId } = body;
  if (
    !Array.isArray(earlier) ||
    earlier.length >= MAX_EDITS_PER_SAVE ||
    (writeId !== undefined && (typeof writeId !== "string" || !/^[a-f0-9-]{36}$/i.test(writeId)))
  )
    return { ok: false, error: "invalid" };
  const now = Date.now();
  function editTime(value: unknown) {
    if (value === undefined) return now;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
      throw new Error("Invalid edit time");
    return Math.min(value, now);
  }
  try {
    const draft = { designDoc, repoUrl: repoUrl.trim(), model: validateC4File(model) };
    let edit: DesignEdit = { designDoc, model: draft.model, editedAt: editTime(body.editedAt) };
    const edits = [edit];
    for (const item of earlier) {
      if (!isRecord(item) || (item.designDoc !== undefined && !isValidDesignDoc(item.designDoc)))
        return { ok: false, error: "invalid" };
      edit = {
        designDoc: item.designDoc === undefined ? edit.designDoc : item.designDoc,
        model: item.model === undefined ? edit.model : validateC4File(item.model),
        editedAt: editTime(item.editedAt),
      };
      edits.push(edit);
    }
    return { ok: true, draft, previous, edits: edits.reverse(), writeId };
  } catch {
    return { ok: false, error: "invalid" };
  }
}
