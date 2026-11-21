import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { SettingsSection } from "../model/settings";

interface SettingsContextValue {
  isOpen: boolean;
  expandedSection: SettingsSection | null;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSection: (section: SettingsSection) => void;
}

const DEFAULT_SETTINGS_CONTEXT: SettingsContextValue = {
  isOpen: false,
  expandedSection: null,
  openSettings: () => {},
  closeSettings: () => {},
  toggleSection: () => {},
};

const SettingsContext = createContext<SettingsContextValue>(DEFAULT_SETTINGS_CONTEXT);

export function SettingsProvider({
  children,
  initialExpandedSection = null,
}: {
  children: ReactNode;
  initialExpandedSection?: SettingsSection | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>(
    initialExpandedSection,
  );
  useEffect(() => {
    // Remove credentials saved by earlier versions without reading their values.
    try {
      const storage = window.localStorage;
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key === "codepulse.githubToken" || key?.startsWith("codepulse.githubToken."))
          storage.removeItem(key);
      }
    } catch {
      // Browsers can disable local storage.
    }
  }, []);

  function openSettings() {
    setIsOpen(true);
  }

  function closeSettings() {
    setIsOpen(false);
    setExpandedSection(null);
  }

  function toggleSection(section: SettingsSection) {
    setExpandedSection((current) => (current === section ? null : section));
  }

  const value: SettingsContextValue = {
    isOpen,
    expandedSection,
    openSettings,
    closeSettings,
    toggleSection,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
