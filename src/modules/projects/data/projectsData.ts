import { createTranslator, DEFAULT_LOCALE, type Translator } from "@modules/i18n";

import type { Project } from "../model/project";

export function createProjects(t: Translator): Project[] {
  return [
    {
      id: "project-fullstack-web",
      codeName: "PROJ-01",
      title: t("courses.fullstack.title"),
      summary: t("courses.fullstack.summary"),
      dueDate: "2026-11-25 23:59",
      points: 200,
      tags: ["System Architecture", "Mind Map", "GitHub API", "File Tree Diff", "CI/CD"],
      content: t("courses.fullstack.content"),
      attachments: [],
    },
    {
      id: "project-ai-rag-agent",
      codeName: "PROJ-02",
      title: t("courses.react.title"),
      summary: t("courses.react.summary"),
      dueDate: "2026-12-18 23:59",
      points: 250,
      tags: ["Open Source", "Architecture Recovery", "GitGraph", "Commit Diff"],
      content: t("courses.react.content"),
      attachments: [],
    },
  ];
}

export const PROJECTS = createProjects(createTranslator(DEFAULT_LOCALE));
