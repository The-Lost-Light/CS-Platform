import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { demoAuthService } from "@auth/demoAuthService";
import type {
  AuthService,
  LoginCredentials,
  LoginResult,
  User,
} from "@auth/types";

interface AuthContextValue {
  currentUser: User | null;
  login: (credentials: LoginCredentials) => LoginResult;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  service = demoAuthService,
}: {
  children: ReactNode;
  service?: AuthService;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = useCallback(
    (credentials: LoginCredentials): LoginResult => {
      const result = service.login(credentials);
      if (result.ok) setCurrentUser(result.user);
      return result;
    },
    [service],
  );

  const logout = useCallback(() => setCurrentUser(null), []);
  const value = useMemo(
    () => ({ currentUser, login, logout }),
    [currentUser, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
