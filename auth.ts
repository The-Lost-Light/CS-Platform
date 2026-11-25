import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { defineAuth } from "void/auth";

import { parseCreateAccountInput } from "./src/shared/accountPolicy";
import { isRecord } from "./src/shared/isRecord";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./src/shared/passwordPolicy";

const userIndexesPlugin = {
  id: "user-indexes",
  init(authContext) {
    return {
      options: {
        databaseHooks: {
          session: {
            create: {
              async before(session, ctx) {
                const internalAdapter = ctx?.context.internalAdapter ?? authContext.internalAdapter;
                const user = (await internalAdapter.findUserById(session.userId)) as {
                  deleted?: boolean | null;
                } | null;
                if (user?.deleted) {
                  throw new APIError("UNAUTHORIZED", { message: "Invalid email or password" });
                }
              },
            },
          },
        },
      },
    };
  },
  schema: {
    user: {
      fields: {
        deleted: {
          type: "boolean",
          required: true,
          defaultValue: false,
          input: false,
        },
      },
      indexes: [
        { name: "user_deleted_createdAt_idx", fields: ["deleted", "createdAt"] },
        { name: "user_role_banned_deleted_idx", fields: ["deleted", "role", "banned"] },
      ],
    },
  },
} satisfies BetterAuthPlugin;

export default defineAuth(({ defaults }) => ({
  ...defaults,
  // Account mutations and admin user operations use our guarded, transactional endpoints.
  disabledPaths: [
    ...(defaults.disabledPaths ?? []),
    "/update-user",
    "/change-password",
    "/change-email",
    "/delete-user",
    "/delete-user/callback",
    "/admin/update-user",
    "/admin/set-user-password",
    "/admin/set-role",
    "/admin/remove-user",
    "/admin/ban-user",
    "/admin/unban-user",
    "/admin/impersonate-user",
    "/admin/stop-impersonating",
    "/admin/list-users",
    "/admin/get-user",
    "/admin/list-user-sessions",
    "/admin/revoke-user-session",
    "/admin/revoke-user-sessions",
    "/admin/has-permission",
  ],
  emailAndPassword: {
    ...defaults.emailAndPassword,
    enabled: true,
    disableSignUp: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
  },
  hooks: {
    ...defaults.hooks,
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/admin/create-user") {
        const parsed = parseCreateAccountInput(ctx.body);
        if (!parsed.ok) throw new APIError("BAD_REQUEST", { message: parsed.message });
        const nextCtx: typeof ctx = { ...ctx, body: parsed.value };
        const defaultResult = await defaults.hooks?.before?.(nextCtx);
        if (isRecord(defaultResult) && isRecord(defaultResult.context)) {
          return {
            ...defaultResult,
            context: {
              ...defaultResult.context,
              body: {
                ...parsed.value,
                ...(isRecord(defaultResult.context.body) ? defaultResult.context.body : {}),
              },
            },
          };
        }
        return defaultResult !== undefined ? defaultResult : { context: { body: parsed.value } };
      }
      return defaults.hooks?.before?.(ctx);
    }),
  },
  plugins: [...(defaults.plugins ?? []), admin(), userIndexesPlugin],
}));
