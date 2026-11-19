import { createContext, useContext, useState, type ReactNode } from "react";

import {
  githubTokenStorageKey,
  normalizeGithubToken,
  type SettingsSection,
} from "../model/settings";

export interface SettingsContextValue {
  isOpen: boolean;
  focusSection: SettingsSection | null;
  expandedSection: SettingsSection | null;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
  toggleSection: (section: SettingsSection) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  clearGithubToken: () => void;
}

const DEFAULT_SETTINGS_CONTEXT: SettingsContextValue = {
  isOpen: false,
  focusSection: null,
  expandedSection: null,
  openSettings: () => {},
  closeSettings: () => {},
  toggleSection: () => {},
  githubToken: "",
  setGithubToken: () => {},
  clearGithubToken: () => {},
};

const SettingsContext = createContext<SettingsContextValue>(DEFAULT_SETTINGS_CONTEXT);

function readStoredGithubToken(key: string | null): string {
  if (!key) return "";
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return normalizeGithubToken(window.localStorage.getItem(key) ?? "");
    }
  } catch {
    /* Storage may be unavailable. */
  }
  return "";
}

function writeStoredGithubToken(key: string | null, token: string): void {
  if (!key) return;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (token) window.localStorage.setItem(key, token);
      else window.localStorage.removeItem(key);
    }
  } catch {
    /* In-memory token state still works. */
  }
}

export function SettingsProvider({
  children,
  accountScope,
  initialGithubToken,
  initialExpandedSection = null,
}: {
  children: ReactNode;
  accountScope?: string | null;
  initialGithubToken?: string;
  initialExpandedSection?: SettingsSection | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusSection, setFocusSection] = useState<SettingsSection | null>(null);
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>(
    initialExpandedSection,
  );
  const scopeKey = githubTokenStorageKey(accountScope);
  const effectiveKey = scopeKey ?? (initialGithubToken !== undefined ? "__memory__" : null);

  const [tokenCache, setTokenCache] = useState<Record<string, string>>(() =>
    effectiveKey && initialGithubToken !== undefined
      ? { [effectiveKey]: normalizeGithubToken(initialGithubToken) }
      : {},
  );

  const githubToken =
    effectiveKey === null
      ? ""
      : Object.hasOwn(tokenCache, effectiveKey)
        ? tokenCache[effectiveKey]
        : readStoredGithubToken(scopeKey);

  function setGithubToken(raw: string) {
    const next = normalizeGithubToken(raw);
    if (scopeKey !== null) {
      writeStoredGithubToken(scopeKey, next);
    }
    if (effectiveKey !== null) {
      setTokenCache((previous) => ({ ...previous, [effectiveKey]: next }));
    }
  }

  function clearGithubToken() {
    setGithubToken("");
  }

  function openSettings(section?: SettingsSection) {
    setFocusSection(section ?? null);
    setExpandedSection(section ?? null);
    setIsOpen(true);
  }

  function closeSettings() {
    setIsOpen(false);
    setFocusSection(null);
    setExpandedSection(null);
  }

  function toggleSection(section: SettingsSection) {
    setExpandedSection((current) => (current === section ? null : section));
  }

  const value: SettingsContextValue = {
    isOpen,
    focusSection,
    expandedSection,
    openSettings,
    closeSettings,
    toggleSection,
    githubToken,
    setGithubToken,
    clearGithubToken,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
