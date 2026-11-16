import type { ReactNode } from 'react';
import { LoginView } from '../components/auth/LoginView';
import { useAuth } from './AuthProvider';
import type { User } from './types';

export interface AuthenticatedSession {
  currentUser: User;
  logout: () => void;
}

export function AuthGate({ children }: {
  children: (session: AuthenticatedSession) => ReactNode;
}) {
  const { currentUser, login, logout } = useAuth();

  // Unmount authenticated content on logout so a new session starts at home.
  return currentUser
    ? children({ currentUser, logout })
    : <LoginView onLogin={login} />;
}
