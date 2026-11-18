import { serverAuthService, loadSession, signOut } from "../services/serverAuthService";
import type { AuthService, LoginCredentials, LoginResult, User } from "../model/types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthContextValue {
  currentUser: User | null;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
  loading: boolean;
  sessionError: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  service = serverAuthService,
}: {
  children: ReactNode;
  service?: AuthService;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    const result = await service.login(credentials);
    if (result.ok) setCurrentUser(result.user);
    return result;
  };

  const [loading, setLoading] = useState(service === serverAuthService);
  const [sessionError, setSessionError] = useState(false);
  useEffect(() => {
    if (service !== serverAuthService) return;
    let active = true;
    loadSession()
      .then((user) => {
        if (active) setCurrentUser(user);
      })
      .catch(() => {
        if (active) setSessionError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [service]);
  const logout = async () => {
    try {
      if (service === serverAuthService) await signOut();
      setCurrentUser(null);
      setSessionError(false);
    } catch {
      setCurrentUser(null);
      setSessionError(true);
    }
  };
  const value: AuthContextValue = { currentUser, login, logout, loading, sessionError };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
