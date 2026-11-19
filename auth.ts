import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { defineAuth } from "void/auth";
import {
  isValidPasswordLength,
  MAX_CURRENT_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./src/shared/passwordPolicy";

export default defineAuth(({ defaults }) => ({
  ...defaults,
  // Account mutations use our guarded, transactional management endpoints.
  disabledPaths: [
    ...(defaults.disabledPaths ?? []),
    "/admin/update-user",
    "/admin/set-user-password",
    "/admin/set-role",
    "/admin/remove-user",
    "/admin/ban-user",
  ],
  emailAndPassword: {
    ...defaults.emailAndPassword,
    enabled: true,
    disableSignUp: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // Better Auth also applies this limit to sign-in and current-password checks.
    maxPasswordLength: MAX_CURRENT_PASSWORD_LENGTH,
  },
  hooks: {
    ...defaults.hooks,
    before: createAuthMiddleware(async (ctx) => {
      const newPassword =
        ctx.path === "/admin/create-user" || ctx.path === "/sign-up/email"
          ? ctx.body?.password
          : ctx.body?.newPassword;
      if (newPassword !== undefined && !isValidPasswordLength(newPassword))
        throw new APIError("BAD_REQUEST", {
          message: `Use a password of ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`,
        });
      return defaults.hooks?.before?.(ctx);
    }),
  },
  plugins: [...(defaults.plugins ?? []), admin()],
}));
