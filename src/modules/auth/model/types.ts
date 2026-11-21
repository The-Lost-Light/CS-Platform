export interface User {
  id?: string;
  studentId: string;
  name: string;
  role: string;
}

export interface LoginCredentials {
  studentId: string;
  password: string;
}

type LoginErrorCode = "accountRequired" | "passwordRequired" | "invalidCredentials" | "unavailable";

export type LoginResult = { ok: true; user: User } | { ok: false; error: LoginErrorCode };

export interface AuthService {
  login(credentials: LoginCredentials): LoginResult | Promise<LoginResult>;
}
