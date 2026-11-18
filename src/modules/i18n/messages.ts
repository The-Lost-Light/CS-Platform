import coursesEn from "./en/courses";
import runtimeEn from "./en/runtime";
import uiEn from "./en/ui";
import coursesZh from "./zh-TW/courses";
import runtimeZh from "./zh-TW/runtime";
import uiZh from "./zh-TW/ui";

export const englishMessages = { ...uiEn, ...coursesEn, ...runtimeEn };
export type MessageKey = keyof typeof englishMessages;
export type Messages = Record<MessageKey, string>;
export const traditionalChineseMessages = {
  ...uiZh,
  ...coursesZh,
  ...runtimeZh,
} satisfies Messages;

export type Locale = "en" | "zh-TW";
export const DEFAULT_LOCALE: Locale = "en";
export const messages: Record<Locale, Messages> = {
  en: englishMessages,
  "zh-TW": traditionalChineseMessages,
};
export const LOCALE_STORAGE_KEY = "codepulse.locale";
export const SUPPORTED_LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
];

export function isLocale(value: unknown): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale.value === value);
}

export function resolveLocale(stored: unknown, languages: readonly string[] = []): Locale {
  if (isLocale(stored)) return stored;
  for (const language of languages) {
    if (/^en(?:-|$)/i.test(language)) return "en";
    if (/^zh(?:-|$)/i.test(language)) return "zh-TW";
  }
  return DEFAULT_LOCALE;
}

export type TranslationParams = Record<string, string | number | undefined>;
export type Translator = (key: MessageKey, params?: TranslationParams) => string;

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(englishMessages, value);
}

/** Values are interpolated once so user code, braces, and dollar signs stay literal. */
export function createTranslator(locale: Locale): Translator {
  return (key, params) => {
    const translated = Object.hasOwn(messages[locale], key) ? messages[locale][key] : key;
    if (!params) return translated;
    return translated.replace(/\{(\w+)\}/g, (token, key: string) =>
      Object.hasOwn(params, key) ? String(params[key] ?? "") : token,
    );
  };
}
