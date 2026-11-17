import type { AuthService } from '@auth/types';

// Frontend demonstration only: this checks required fields, not an account store.
export const demoAuthService: AuthService = {
  login(credentials) {
    const studentId = credentials.studentId.trim();
    if (!studentId) return { ok: false, error: 'accountRequired' };
    if (!credentials.password.trim()) return { ok: false, error: 'passwordRequired' };

    return {
      ok: true,
      user: {
        studentId,
        name: credentials.name.trim() || studentId,
        role: credentials.role,
      },
    };
  },
};
