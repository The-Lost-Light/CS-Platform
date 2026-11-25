export function createLimitedBodyResponse(request: Request, maxBytes: number): Response | null {
  if (!request.body || Number(request.headers.get("Content-Length")) > maxBytes) return null;
  let bytes = 0;
  const bounded = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > maxBytes) throw new Error("Request body too large");
        controller.enqueue(chunk);
      },
    }),
  );
  return new Response(bounded, { headers: request.headers });
}

export async function readLimitedJson(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; error: "tooLarge" | "invalid" }> {
  const bodyText = await readLimitedText(request, maxBytes);
  if (bodyText === null) return { ok: false, error: "tooLarge" };
  try {
    return { ok: true, value: JSON.parse(bodyText) };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

export async function readLimitedText(request: Request, maxBytes: number) {
  if (Number(request.headers.get("Content-Length")) > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    return chunks.join("") + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
