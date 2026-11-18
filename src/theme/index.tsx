import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { isThemeMode, resolveTheme, type ResolvedTheme, type ThemeMode } from "@theme/model";
export { isThemeMode, resolveTheme, SUPPORTED_THEME_MODES } from "@theme/model";
export type { ResolvedTheme, ThemeMode } from "@theme/model";
const THEME_STORAGE_KEY = "codepulse.themeMode";

function initialThemeMode(): ThemeMode {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeMode(stored)) return stored;
    }
  } catch {
    /* Storage may be unavailable. */
  }
  return "system";
}

function getSystemPrefersDark(): boolean {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
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
  mode: "system",
  setMode: () => {},
  resolvedTheme: "light",
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
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const resolvedTheme = resolveTheme(mode, systemPrefersDark);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = resolvedTheme;
    }
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      }
    } catch {
      /* In-memory switching still works. */
    }
  }, [isDark, mode, resolvedTheme]);

  const value: ThemeContextValue = {
    mode,
    setMode: (nextMode) => {
      if (isThemeMode(nextMode)) setModeState(nextMode);
    },
    resolvedTheme,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
