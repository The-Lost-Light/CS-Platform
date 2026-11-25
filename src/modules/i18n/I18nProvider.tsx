import { useStoredPreference } from "@shared/useStoredPreference";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  createTranslator,
  isLocale,
  resolveLocale,
  type Locale,
  type Translator,
} from "./messages";

export type LanguagePreference = "auto" | Locale;
const PREFERENCE_KEY = "cap.languagePreference";
interface I18nContextValue {
  locale: Locale;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  t: Translator;
}
const I18nContext = createContext<I18nContextValue | null>(null);
function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === "auto" || isLocale(value);
}
function systemLocale(): Locale {
  return resolveLocale(
    null,
    typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]),
  );
}
export function I18nProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage?: Locale;
}) {
  const [preference, setPreference] = useStoredPreference(
    PREFERENCE_KEY,
    isLanguagePreference,
    "auto",
    initialLanguage,
  );
  const [detectedLocale, setDetectedLocale] = useState(systemLocale);
  const locale = preference === "auto" ? detectedLocale : preference;
  useEffect(() => {
    const update = () => setDetectedLocale(systemLocale());
    window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);
  const value: I18nContextValue = {
    locale,
    preference,
    setPreference,
    t: createTranslator(locale),
  };
  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-Hant";
    document.title = createTranslator(locale)("app.title");
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
