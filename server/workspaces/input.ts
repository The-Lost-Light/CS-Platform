import { validateC4File, C4_FILE_MAX_BYTES } from "@modules/c4-model";
import type { PersonalWorkspace } from "@modules/workspace";
import { isValidWorkspaceRepoUrl } from "@shared/githubRepoUrl";
import { readLimitedJson } from "@shared/http/readLimitedText";
import { isRecord } from "@shared/isRecord";
import { isValidDesignDoc } from "@shared/workspacePolicy";

type WorkspaceInput =
  | { ok: true; draft: PersonalWorkspace; previous: string | null }
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
  try {
    const draft = { designDoc, repoUrl: repoUrl.trim(), model: validateC4File(model) };
    return { ok: true, draft, previous };
  } catch {
    return { ok: false, error: "invalid" };
  }
}
