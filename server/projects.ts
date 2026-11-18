import { db, desc } from "void/db";
import { projects, removedProjects } from "../db/schema";
import { getLocalizedProjects } from "@data/localizedProjects";
import type { Locale } from "@i18n/messages";
import { mergeProjectCatalog } from "@domain/projectCatalog";

export async function listProjects(locale: Locale = "en") {
  const rows = await db
    .select({ data: projects.data })
    .from(projects)
    .orderBy(desc(projects.createdAt));
  const removed = (await db.select().from(removedProjects)).map((row) => row.id);
  const templates = getLocalizedProjects(locale).projects;
  return mergeProjectCatalog(
    templates,
    rows.map((row) => row.data),
    removed,
  );
}
