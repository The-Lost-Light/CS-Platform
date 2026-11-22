import type { MessageKey } from "@modules/i18n";
import { useState, type FormEvent } from "react";

export function useAccountUpdate(
  endpoint: string,
  errorMessage: (code?: string) => MessageKey,
  onSuccess: (signedOut: boolean) => void,
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { error?: string; signedOut?: boolean };
      if (!response.ok) {
        setError(errorMessage(result.error));
        return;
      }
      onSuccess(Boolean(result.signedOut));
      if (result.signedOut) window.location.assign("/");
    } catch {
      setError("admin.operationFailed");
    } finally {
      setPending(false);
    }
  }
  return { pending, error, submit, clearError: () => setError(null) };
}
