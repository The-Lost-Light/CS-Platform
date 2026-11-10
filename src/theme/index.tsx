import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const SUPPORTED_THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];
const THEME_STORAGE_KEY = 'codepulse.themeMode';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}

function initialThemeMode(): ThemeMode {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeMode(stored)) return stored;
    }
  } catch {
    /* Storage may be unavailable. */
  }
  return 'system';
}

function getSystemPrefersDark(): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
}

const DEFAULT_THEME_CONTEXT: ThemeContextValue = {
  mode: 'system',
  setMode: () => {},
  resolvedTheme: 'light',
  isDark: false,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME_CONTEXT);

export function ThemeProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(() => initialMode ?? initialThemeMode());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPrefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const resolvedTheme = resolveTheme(mode, systemPrefersDark);
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = resolvedTheme;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      }
    } catch {
      /* In-memory switching still works. */
    }
  }, [isDark, mode, resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode: (nextMode: ThemeMode) => {
        if (isThemeMode(nextMode)) setModeState(nextMode);
      },
      resolvedTheme,
      isDark,
    }),
    [mode, resolvedTheme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
