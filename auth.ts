import { admin } from "better-auth/plugins";
import { defineAuth } from "void/auth";

export default defineAuth(({ defaults }) => ({
  ...defaults,
  emailAndPassword: {
    ...defaults.emailAndPassword,
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  plugins: [...(defaults.plugins ?? []), admin()],
}));
