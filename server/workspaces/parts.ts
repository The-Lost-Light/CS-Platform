export const WORKSPACE_PART_MAX_BYTES = 384 * 1024;

/** Split serialized workspace JSON into UTF-8 byte-bounded chunks without splitting surrogate pairs. */
export function splitWorkspaceContent(
  content: string,
  maxBytes = WORKSPACE_PART_MAX_BYTES,
): string[] {
  if (!Number.isInteger(maxBytes) || maxBytes < 4) {
    throw new RangeError("maxBytes must be an integer >= 4");
  }
  // Every UTF-16 code unit encodes to at most 3 UTF-8 bytes (surrogate pairs take 2 units -> 4 bytes).
  if (content.length * 3 <= maxBytes) return [content];
  const chunks: string[] = [];
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < content.length;) {
    const code = content.charCodeAt(i);
    let unitLen = 1;
    let byteLen = 3;
    if (code <= 0x7f) {
      byteLen = 1;
    } else if (code <= 0x7ff) {
      byteLen = 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < content.length) {
      const next = content.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        unitLen = 2;
        byteLen = 4;
      }
    }
    if (bytes + byteLen > maxBytes) {
      chunks.push(content.slice(start, i));
      start = i;
      bytes = byteLen;
    } else {
      bytes += byteLen;
    }
    i += unitLen;
  }
  chunks.push(content.slice(start));
  return chunks;
}
