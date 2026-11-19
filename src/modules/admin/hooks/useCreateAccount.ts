import { useState, type FormEvent } from "react";

export function useCreateAccount(onCreated: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/admin/create-user", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          name: data.get("name"),
          password: data.get("password"),
          role: data.get("role"),
        }),
      });
      if (!response.ok) throw new Error("Create failed");
      onCreated();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return { pending, error, submit };
}
