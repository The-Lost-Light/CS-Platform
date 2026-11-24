import { Buffer } from "node:buffer";

import {
  projectAttachmentParts as parts,
  projectAttachments as attachments,
  projects,
} from "@db/schema";
import { and, type BatchItem, db, eq, sql } from "void/db";

export const attachmentMetadata = {
  id: attachments.attachmentId,
  name: attachments.name,
  size: attachments.size,
};

export async function insertAttachments(projectId: string, files: File[]) {
  const inserts: BatchItem<"sqlite">[] = [];
  for (const file of files) {
    const attachmentId = crypto.randomUUID();
    const bytes = Buffer.from(await file.arrayBuffer());
    inserts.push(
      db.insert(attachments).values({
        projectId,
        attachmentId,
        name: file.name,
        size: file.size,
      }),
    );
    // Each encoded chunk stays within D1's single-row limit; 0-byte files need no chunk rows.
    const chunkSize = 384 * 1024;
    for (let part = 0; part * chunkSize < bytes.length; part++) {
      inserts.push(
        db.insert(parts).values({
          projectId,
          attachmentId,
          part,
          content: bytes.toString("base64", part * chunkSize, (part + 1) * chunkSize),
        }),
      );
    }
  }
  return inserts;
}

export async function downloadProjectAttachment(projectId: string, attachmentId: string) {
  const rows = await db
    .select({ name: attachments.name, content: parts.content })
    .from(attachments)
    .leftJoin(
      parts,
      and(
        eq(parts.projectId, attachments.projectId),
        eq(parts.attachmentId, attachments.attachmentId),
      ),
    )
    .where(
      and(
        eq(attachments.projectId, projectId),
        eq(attachments.attachmentId, attachmentId),
        eq(attachments.deleted, false),
        sql`EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.id} = ${projectId} AND ${projects.deleted} = 0)`,
      ),
    )
    .orderBy(parts.part);
  if (!rows.length) return null;
  return new Response(Buffer.from(rows.map((row) => row.content ?? "").join(""), "base64"), {
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
