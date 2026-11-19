export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type ThemePalette = "blue" | "lavender" | "sage" | "slate";

export interface ThemePaletteSwatch {
  value: ThemePalette;
  primary: string;
  tint: string;
  darkPrimary: string;
  darkTint: string;
  isDefault?: boolean;
}

export const SUPPORTED_THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];
export const DEFAULT_THEME_PALETTE: ThemePalette = "blue";
export const SUPPORTED_THEME_PALETTES: readonly ThemePalette[] = [
  "blue",
  "lavender",
  "sage",
  "slate",
];

export const THEME_PALETTE_SWATCHES: readonly ThemePaletteSwatch[] = [
  {
    value: "blue",
    primary: "#4f7299",
    tint: "#d6e6f8",
    darkPrimary: "#85bfff",
    darkTint: "#224e84",
    isDefault: true,
  },
  {
    value: "lavender",
    primary: "#6e5c99",
    tint: "#e8dff9",
    darkPrimary: "#bfb0e6",
    darkTint: "#4a3b70",
  },
  {
    value: "sage",
    primary: "#46735e",
    tint: "#d6ede2",
    darkPrimary: "#98ccb2",
    darkTint: "#2e5241",
  },
  {
    value: "slate",
    primary: "#526073",
    tint: "#dee4ed",
    darkPrimary: "#b2bfd1",
    darkTint: "#3a4250",
  },
];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function isThemePalette(value: unknown): value is ThemePalette {
  return value === "blue" || value === "lavender" || value === "sage" || value === "slate";
}

export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return systemPrefersDark ? "dark" : "light";
}
