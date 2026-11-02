import ui from './ui.en';
import courses from './courses.en';
import runtime from './runtime.en';

export const englishMessages: Record<string, string> = {
  ...ui,
  ...courses,
  ...runtime,
  '語言': 'Language',
  '自動（{language}）': 'Auto ({language})',
  '請輸入學號或電子郵件帳號': 'Enter your student ID or email address',
  '請輸入登入密碼': 'Enter your password',
  'Pyodide 準備中...': 'Preparing Pyodide...',
  '無法同步 GitHub 專案，請稍後再試。': 'Could not sync the GitHub project. Please try again.',
  '高': 'High',
  '中': 'Medium',
  '低': 'Low',
  '筆數：{count}': 'Count: {count}',
  '線上': 'Online',
  '檔案 / 目錄匹配': 'Exact / folder match',
  '僅檔名匹配': 'Filename match only',
  'GitHub 中未找到': 'Missing in GitHub tree',
  '未結案問題': 'Open issues',
  '合併檢視': 'Unified',
  '分割檢視': 'Split',
  '分支：': 'Branch: ',
  'GitHub 實際檔案結構樹（{count} 個檔案）': 'GitHub file tree ({count} files)',
  '提交次數：{count}': 'Commits: {count}',
  '題數：{count}': 'Assignments: {count}',
  '專題數：{count}': 'Projects: {count}',
  '、': ', ',
  '「{label}」': '“{label}”',
};

export type Locale = 'zh-TW' | 'en';
export const DEFAULT_LOCALE: Locale = 'zh-TW';
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
export type Translator = (message: string, params?: TranslationParams) => string;

/** Values are interpolated once so user code, braces, and dollar signs stay literal. */
export function createTranslator(locale: Locale): Translator {
  return (message, params) => {
    const translated = locale === 'en' && Object.hasOwn(englishMessages, message) ? englishMessages[message] : message;
    if (!params) return translated;
    return translated.replace(/\{(\w+)\}/g, (token, key: string) =>
      Object.hasOwn(params, key) ? String(params[key] ?? '') : token,
    );
  };
}
