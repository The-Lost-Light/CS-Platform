import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { parseArgs } from "node:util";

import { hashPassword } from "better-auth/crypto";

import {
  isValidPasswordLength,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "../src/shared/passwordPolicy.ts";
const passwordLength = `${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} 字元`;

function promptForAdmin() {
  let hidePassword = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!hidePassword) process.stderr.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: Boolean(process.stdin.isTTY),
    historySize: 0,
  });

  return new Promise((resolve, reject) => {
    rl.once("close", () => reject(new Error("帳號資料輸入未完成。")));
    rl.question("帳號名稱（預設 Administrator）：", (name) => {
      rl.question("Email：", (email) => {
        rl.question(`密碼（${passwordLength}）：`, (password) => {
          resolve({ name, email, password });
          rl.close();
        });
        hidePassword = true;
      });
    });
  }).finally(() => {
    if (hidePassword) process.stderr.write("\n");
  });
}

function readCredentials() {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      email: { type: "string" },
      password: { type: "string" },
      env: { type: "boolean" },
    },
  });
  if (values.env) {
    if (Object.keys(values).length > 1) {
      throw new Error("--env 必須單獨使用。");
    }
    return {
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    };
  }
  return Object.keys(values).length ? values : promptForAdmin();
}

const credentials = await readCredentials();
const name = credentials.name?.trim() || "Administrator";
const email = credentials.email?.trim().toLowerCase();
const password = credentials.password;
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("請提供有效的 Email。");
}
if (!isValidPasswordLength(password)) {
  throw new Error(`密碼長度必須為 ${passwordLength}。`);
}
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
const id = randomUUID();
const now = Date.now();
const hash = await hashPassword(password);
mkdirSync(".void", { recursive: true });
writeFileSync(
  ".void/bootstrap-admin.sql",
  "INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,role,banned,deleted) VALUES (" +
    [quote(id), quote(name), quote(email), 0, now, now, quote("admin"), 0, 0].join(",") +
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
