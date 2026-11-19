import { downloadProjectAttachment } from "@server/projects";
import { defineHandler } from "void";
import { requireAuth } from "void/auth";

export const GET = defineHandler(async (c) => {
  requireAuth(c);
  return (
    (await downloadProjectAttachment(c.req.param("id") ?? "", c.req.param("attachmentId") ?? "")) ??
    c.notFound()
  );
});
