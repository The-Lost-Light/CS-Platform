import { isRecord } from "./isRecord";
import { isValidPasswordLength, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./passwordPolicy";

export const MAX_ACCOUNT_NAME_LENGTH = 100;
export const MAX_ACCOUNT_EMAIL_LENGTH = 254;
export const ACCOUNT_ROLES = ["user", "admin"] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export interface CreateAccountInput {
  name: string;
  email: string;
  password: string;
  role: AccountRole;
}

export type CreateAccountParseResult =
  | { ok: true; value: CreateAccountInput }
  | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_CREATE_KEYS = new Set(["name", "email", "password", "role"]);

export function isAccountRole(value: unknown): value is AccountRole {
  return value === "user" || value === "admin";
}

export function normalizeAccountName(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_ACCOUNT_NAME_LENGTH) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeAccountEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_ACCOUNT_EMAIL_LENGTH) return null;
  const trimmed = value.trim();
  return EMAIL_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function parseCreateAccountInput(body: unknown): CreateAccountParseResult {
  if (!isRecord(body) || Object.keys(body).some((key) => !ALLOWED_CREATE_KEYS.has(key))) {
    return { ok: false, message: "Invalid account payload." };
  }
  const name = normalizeAccountName(body.name);
  if (!name) {
    return { ok: false, message: `Enter a name of 1–${MAX_ACCOUNT_NAME_LENGTH} characters.` };
  }
  const email = normalizeAccountEmail(body.email);
  if (!email) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!isValidPasswordLength(body.password)) {
    return {
      ok: false,
      message: `Use a password of ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`,
    };
  }
  if (!isAccountRole(body.role)) {
    return { ok: false, message: "Select a valid role." };
  }
  return {
    ok: true,
    value: { name, email, password: body.password, role: body.role },
  };
}
