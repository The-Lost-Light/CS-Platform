import { useStoredPreference } from "@shared/useStoredPreference";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  DEFAULT_THEME_PALETTE,
  isThemeMode,
  isThemePalette,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
  type ThemePalette,
} from "./model";

const THEME_STORAGE_KEY = "cap.themeMode";
const PALETTE_STORAGE_KEY = "cap.themePalette";

function getSystemPrefersDark(): boolean {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  palette: ThemePalette;
  setPalette: (palette: ThemePalette) => void;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
}

const DEFAULT_THEME_CONTEXT: ThemeContextValue = {
  mode: "system",
  setMode: () => {},
  palette: DEFAULT_THEME_PALETTE,
  setPalette: () => {},
  resolvedTheme: "light",
  isDark: false,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME_CONTEXT);

export function ThemeProvider({
  children,
  initialMode,
  initialPalette,
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
  initialPalette?: ThemePalette;
}) {
  const [mode, setMode] = useStoredPreference(
    THEME_STORAGE_KEY,
    isThemeMode,
    "system",
    initialMode,
  );
  const [palette, setPalette] = useStoredPreference(
    PALETTE_STORAGE_KEY,
    isThemePalette,
    DEFAULT_THEME_PALETTE,
    initialPalette,
  );
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
      document.documentElement.dataset.themePalette = palette;
    }
  }, [isDark, palette, resolvedTheme]);

  const value: ThemeContextValue = {
    mode,
    setMode,
    palette,
    setPalette,
    resolvedTheme,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
