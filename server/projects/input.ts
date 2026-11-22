import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  attachmentsWithinLimit,
  parseProjectInput,
  type ProjectAttachment,
} from "@modules/projects";

// Leave room for the UTF-8 Markdown, other fields and multipart headers.
const MAX_BODY_BYTES = MAX_ATTACHMENT_BYTES + 256 * 1024;

export async function readProjectInput(request: Request, existing: ProjectAttachment[] = []) {
  if (!request.body || Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES) return null;
  let bytes = 0;
  const bounded = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > MAX_BODY_BYTES) throw new Error("Project upload too large");
        controller.enqueue(chunk);
      },
    }),
  );
  const body = new Response(bounded, { headers: request.headers });
  try {
    let fields: unknown;
    let entries: unknown[];
    if (request.headers.get("Content-Type")?.startsWith("multipart/form-data")) {
      const form = await body.formData();
      const points = form.get("points");
      fields = {
        ...Object.fromEntries(form),
        points: typeof points === "string" && points.trim() ? Number(points) : NaN,
      };
      entries = form.getAll("attachments");
    } else {
      fields = await body.json();
      if (!fields || typeof fields !== "object") return null;
      const ids = "attachments" in fields ? fields.attachments : existing.map((file) => file.id);
      if (!Array.isArray(ids)) return null;
      entries = ids;
    }
    const project = parseProjectInput(fields);
    if (!project || entries.length > MAX_ATTACHMENTS) return null;
    const retained: ProjectAttachment[] = [];
    const uploads: File[] = [];
    for (const entry of entries) {
      if (typeof entry === "string") {
        const file = existing.find((item) => item.id === entry);
        if (!file || retained.includes(file)) return null;
        retained.push(file);
      } else if (
        entry instanceof File &&
        entry.name.trim() &&
        entry.name.length <= 255 &&
        !/[\\/\p{Cc}]/u.test(entry.name)
      ) {
        uploads.push(entry);
      } else {
        return null;
      }
    }
    if (!attachmentsWithinLimit([...retained, ...uploads])) return null;
    return { project, retained, uploads };
  } catch {
    return null;
  }
}

export type ProjectInput = NonNullable<Awaited<ReturnType<typeof readProjectInput>>>;
