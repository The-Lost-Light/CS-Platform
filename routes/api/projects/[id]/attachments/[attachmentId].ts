import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import { downloadProjectAttachment } from "@server/projects";

export const GET = defineHandler(async (c) => {
  requireAuth(c);
  return (
    (await downloadProjectAttachment(c.req.param("id") ?? "", c.req.param("attachmentId") ?? "")) ??
    c.notFound()
  );
});
