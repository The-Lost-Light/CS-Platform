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
