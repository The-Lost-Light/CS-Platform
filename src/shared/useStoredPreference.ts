import { useEffect, useState } from "react";

export function useStoredPreference<T extends string>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
  initial?: T,
) {
  const [value, setValue] = useState<T>(() => {
    if (initial !== undefined) return initial;
    try {
      const stored = globalThis.window?.localStorage.getItem(key);
      if (isValid(stored)) return stored;
    } catch {
      // Storage may be unavailable.
    }
    return fallback;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Keep the preference in memory when persistence is unavailable.
    }
  }, [key, value]);
  function update(next: T) {
    if (isValid(next)) setValue(next);
  }
  return [value, update] as const;
}
