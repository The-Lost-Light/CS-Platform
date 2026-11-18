import { admin } from "better-auth/plugins";
import { defineAuth } from "void/auth";

export default defineAuth(({ defaults }) => ({
  ...defaults,
  // Account mutations use our guarded, transactional management endpoints.
  disabledPaths: [
    ...(defaults.disabledPaths ?? []),
    "/admin/update-user",
    "/admin/set-role",
    "/admin/remove-user",
    "/admin/ban-user",
  ],
  emailAndPassword: {
    ...defaults.emailAndPassword,
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  plugins: [...(defaults.plugins ?? []), admin()],
}));
