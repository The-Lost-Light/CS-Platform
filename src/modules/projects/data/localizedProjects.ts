import { createProjects } from "./projectsData";
import { createTranslator, type Locale } from "@modules/i18n";

export function getLocalizedProjects(locale: Locale) {
  return { projects: createProjects(createTranslator(locale)) };
}
