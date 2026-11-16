export interface User {
  studentId: string;
  name: string;
  role: string;
}

export interface LoginCredentials extends User {
  password: string;
}

export type LoginErrorCode = 'accountRequired' | 'passwordRequired';

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: LoginErrorCode };

export interface AuthService {
  login(credentials: LoginCredentials): LoginResult;
}

export interface AuthenticatedSession {
  currentUser: User;
  logout: () => void;
}
