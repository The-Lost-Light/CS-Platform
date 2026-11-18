export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const SUPPORTED_THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return systemPrefersDark ? "dark" : "light";
}
