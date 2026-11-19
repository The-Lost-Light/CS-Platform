import { Buffer } from "node:buffer";

import { projectAttachmentParts as parts } from "@db/schema";
import { and, db, eq } from "void/db";

export const attachmentMetadata = { id: parts.attachmentId, name: parts.name, size: parts.size };

export async function insertAttachmentParts(projectId: string, files: File[]) {
  const inserts = [];
  for (const file of files) {
    const attachmentId = crypto.randomUUID();
    const bytes = Buffer.from(await file.arrayBuffer());
    // Each encoded chunk stays within D1's single-row limit. Part zero also indexes empty files.
    const chunkSize = 384 * 1024;
    const count = Math.max(1, Math.ceil(bytes.length / chunkSize));
    for (let part = 0; part < count; part++) {
      inserts.push(
        db.insert(parts).values({
          projectId,
          attachmentId,
          part,
          name: file.name,
          size: file.size,
          content: bytes.toString("base64", part * chunkSize, (part + 1) * chunkSize),
        }),
      );
    }
  }
  return inserts;
}

export async function downloadProjectAttachment(projectId: string, attachmentId: string) {
  const rows = await db
    .select({ name: parts.name, content: parts.content })
    .from(parts)
    .where(and(eq(parts.projectId, projectId), eq(parts.attachmentId, attachmentId)))
    .orderBy(parts.part);
  if (!rows.length) return null;
  return new Response(Buffer.from(rows.map((row) => row.content).join(""), "base64"), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition":
        "attachment; filename*=UTF-8''" +
        encodeURIComponent(rows[0].name).replace(
          /['()*]/g,
          (ch) => "%" + ch.charCodeAt(0).toString(16),
        ),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
