import { isRecord } from "@shared/isRecord";
import { validateC4File, C4_FILE_MAX_BYTES } from "@modules/c4-model";
import type { PersonalWorkspace } from "@modules/workspace";
import { readLimitedText } from "@shared/http/readLimitedText";
type WorkspaceInput =
  | { ok: true; draft: PersonalWorkspace; previous: string | null }
  | { ok: false; error: "tooLarge" | "invalid" | "repo" };
export async function readWorkspaceInput(request: Request): Promise<WorkspaceInput> {
  const bodyText = await readLimitedText(request, C4_FILE_MAX_BYTES + 1024 * 1024);
  if (bodyText === null) return { ok: false, error: "tooLarge" };
  try {
    const body: unknown = JSON.parse(bodyText);
    if (!isRecord(body) || !isRecord(body.draft)) return { ok: false, error: "invalid" };
    const previous = body.revision;
    if (previous !== null && (typeof previous !== "string" || previous.length !== 36))
      return { ok: false, error: "invalid" };
    const { designDoc, repoUrl, model } = body.draft;
    if (typeof designDoc !== "string" || typeof repoUrl !== "string")
      return { ok: false, error: "invalid" };
    // Accept the URL and owner/repository formats used by the GitHub panel.
    if (
      repoUrl &&
      (repoUrl.length > 300 ||
        !/^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/)?[\w.-]+\/[\w.-]+\/?$/i.test(repoUrl.trim()))
    )
      return { ok: false, error: "repo" };
    const draft = { designDoc, repoUrl: repoUrl.trim(), model: validateC4File(model) };
    return { ok: true, draft, previous };
  } catch {
    return { ok: false, error: "invalid" };
  }
}
