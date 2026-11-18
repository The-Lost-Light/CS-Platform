import { useState, type FormEvent } from "react";

export function useCreateAccount(onCreated?: () => void) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setStatus(null);
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
      form.reset();
      setStatus("success");
      onCreated?.();
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }
  return { pending, status, submit };
}
