import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createTranslator, isLocale, resolveLocale, type Locale, type Translator } from './messages';

export { SUPPORTED_LOCALES } from './messages';
export type { Locale, MessageKey, Translator } from './messages';
export type LanguagePreference = 'auto' | Locale;
const PREFERENCE_KEY = 'codepulse.languagePreference';
interface I18nContextValue {
  locale: Locale;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  t: Translator;
}
const I18nContext = createContext<I18nContextValue | null>(null);
function initialPreference(): LanguagePreference {
  try {
    const stored = window.localStorage.getItem(PREFERENCE_KEY);
    if (isLocale(stored)) return stored;
  } catch { /* Storage may be unavailable. */ }
  return 'auto';
}
function systemLocale(): Locale {
  return resolveLocale(null, typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]);
}
export function I18nProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage?: Locale }) {
  const [preference, setPreference] = useState<LanguagePreference>(() => initialLanguage ?? initialPreference());
  const [detectedLocale, setDetectedLocale] = useState(systemLocale);
  const locale = preference === 'auto' ? detectedLocale : preference;
  useEffect(() => {
    const update = () => setDetectedLocale(systemLocale());
    window.addEventListener('languagechange', update);
    return () => window.removeEventListener('languagechange', update);
  }, []);
  const value = useMemo<I18nContextValue>(() => ({
    locale, preference,
    setPreference: next => { if (next === 'auto' || isLocale(next)) setPreference(next); },
    t: createTranslator(locale),
  }), [locale, preference]);
  useEffect(() => {
    document.documentElement.lang = locale === 'zh-TW' ? 'zh-Hant' : 'en';
    document.title = `CodePulse Edu — ${value.t('app.title')}`;
    try { window.localStorage.setItem(PREFERENCE_KEY, preference); } catch { /* In-memory switching still works. */ }
  }, [locale, preference, value]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
