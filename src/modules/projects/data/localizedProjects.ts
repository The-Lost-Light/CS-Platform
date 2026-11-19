import { createTranslator, type Locale } from "@modules/i18n";

import { createProjects } from "./projectsData";

export function getLocalizedProjects(locale: Locale) {
  return { projects: createProjects(createTranslator(locale)) };
}
