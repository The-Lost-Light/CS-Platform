import type { LoginCredentials, LoginResult } from "../model/types";
import type { MessageKey } from "@modules/i18n";
import { useState, type FormEvent } from "react";

export type LoginHandler = (credentials: LoginCredentials) => LoginResult | Promise<LoginResult>;

type LoginError = Extract<LoginResult, { ok: false }>["error"];
const ERROR_MESSAGES = {
  accountRequired: "auth.errors.accountRequired",
  passwordRequired: "auth.errors.passwordRequired",
  invalidCredentials: "auth.errors.invalidCredentials",
  unavailable: "auth.errors.unavailable",
} satisfies Record<LoginError, MessageKey>;

export function useLoginForm(onLogin: LoginHandler) {
  const [credentials, setCredentials] = useState<LoginCredentials>(() => ({
    studentId: "",
    password: "",
    name: "",
    role: "",
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  function updateField(field: keyof LoginCredentials, value: string) {
    setCredentials((current) => ({ ...current, [field]: value }));
  }

  const [pending, setPending] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await onLogin(credentials);
      setError(result.ok ? null : result.error);
    } catch {
      setError("unavailable");
    } finally {
      setPending(false);
    }
  }

  return {
    credentials,
    updateField,
    showPassword,
    togglePassword: () => setShowPassword((current) => !current),
    errorMessage: error ? ERROR_MESSAGES[error] : null,
    handleSubmit,
    pending,
  };
}
