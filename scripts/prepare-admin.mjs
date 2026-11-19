import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  isValidPasswordLength,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "../src/shared/passwordPolicy.ts";
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Administrator";
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !isValidPasswordLength(password)) {
  throw new Error(
    `Set ADMIN_EMAIL, ADMIN_PASSWORD (${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters), and optionally ADMIN_NAME. No database changes were made.`,
  );
}
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
const id = randomUUID();
const now = Date.now();
const hash = await hashPassword(password);
mkdirSync(".void", { recursive: true });
writeFileSync(
  ".void/bootstrap-admin.sql",
  "INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,role,banned) VALUES (" +
    [quote(id), quote(name), quote(email), 0, now, now, quote("admin"), 0].join(",") +
    ");\n" +
    "INSERT INTO account (id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES (" +
    [quote(randomUUID()), quote(id), quote("credential"), quote(id), quote(hash), now, now].join(
      ",",
    ) +
    ");\n",
  { mode: 0o600 },
);
console.log(
  "Prepared .void/bootstrap-admin.sql (password hash only). Apply with pnpm exec void db execute --file .void/bootstrap-admin.sql, then delete this file. Use --remote only for the intended deployed database.",
);
