import { useState, type FormEvent } from 'react';
import { DEFAULT_LOGIN_CREDENTIALS, getDemoCredentials } from './demoAccounts';
import type { LoginCredentials, LoginResult, User } from './types';
import type { MessageKey } from '../i18n';

export type LoginHandler = (credentials: LoginCredentials) => LoginResult;

type LoginError = Extract<LoginResult, { ok: false }>['error'];
const ERROR_MESSAGES = {
  accountRequired: 'auth.errors.accountRequired',
  passwordRequired: 'auth.errors.passwordRequired',
} satisfies Record<LoginError, MessageKey>;

export function useLoginForm(onLogin: LoginHandler) {
  const [credentials, setCredentials] = useState<LoginCredentials>(() => ({ ...DEFAULT_LOGIN_CREDENTIALS }));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  function updateField(field: keyof LoginCredentials, value: string) {
    setCredentials(current => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onLogin(credentials);
    setError(result.ok ? null : result.error);
  }

  function selectDemoAccount(account: User) {
    setCredentials(getDemoCredentials(account));
    setError(null);
  }

  return {
    credentials,
    updateField,
    showPassword,
    togglePassword: () => setShowPassword(current => !current),
    errorMessage: error ? ERROR_MESSAGES[error] : null,
    handleSubmit,
    selectDemoAccount,
  };
}
