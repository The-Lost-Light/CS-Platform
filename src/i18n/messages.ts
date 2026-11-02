import uiEn from './ui.en';
import coursesEn from './courses.en';
import runtimeEn from './runtime.en';
import uiZh from './ui.zh-TW';
import coursesZh from './courses.zh-TW';
import runtimeZh from './runtime.zh-TW';

export const traditionalChineseMessages = { ...uiZh, ...coursesZh, ...runtimeZh };
export type MessageKey = keyof typeof traditionalChineseMessages;
export type Messages = Record<MessageKey, string>;
export const englishMessages = { ...uiEn, ...coursesEn, ...runtimeEn } satisfies Messages;

export type Locale = 'zh-TW' | 'en';
export const DEFAULT_LOCALE: Locale = 'zh-TW';
export const messages: Record<Locale, Messages> = {
  'zh-TW': traditionalChineseMessages,
  en: englishMessages,
};
export const LOCALE_STORAGE_KEY = 'codepulse.locale';
export const SUPPORTED_LOCALES: { value: Locale; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
];

export function isLocale(value: unknown): value is Locale {
  return SUPPORTED_LOCALES.some(locale => locale.value === value);
}

export function resolveLocale(stored: unknown, languages: readonly string[] = []): Locale {
  if (isLocale(stored)) return stored;
  for (const language of languages) {
    if (/^zh(?:-|$)/i.test(language)) return 'zh-TW';
    if (/^en(?:-|$)/i.test(language)) return 'en';
  }
  return DEFAULT_LOCALE;
}

export type TranslationParams = Record<string, string | number | undefined>;
export type Translator = (key: MessageKey, params?: TranslationParams) => string;

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(traditionalChineseMessages, value);
}

/** Values are interpolated once so user code, braces, and dollar signs stay literal. */
export function createTranslator(locale: Locale): Translator {
  return (key, params) => {
    const translated = Object.hasOwn(messages[locale], key) ? messages[locale][key] : key;
    if (!params) return translated;
    return translated.replace(/\{(\w+)\}/g, (token, key: string) =>
      Object.hasOwn(params, key) ? String(params[key] ?? '') : token,
    );
  };
}
