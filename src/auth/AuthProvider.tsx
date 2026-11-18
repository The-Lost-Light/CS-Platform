import { demoAuthService } from "@auth/demoAuthService";
import type { AuthService, LoginCredentials, LoginResult, User } from "@auth/types";
import { createContext, useContext, useState, type ReactNode } from "react";

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

  const login = (credentials: LoginCredentials): LoginResult => {
    const result = service.login(credentials);
    if (result.ok) setCurrentUser(result.user);
    return result;
  };

  const logout = () => setCurrentUser(null);
  const value: AuthContextValue = { currentUser, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
