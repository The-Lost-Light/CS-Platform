import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export function createMigratedDb(
  beforeMigration?: (db: DatabaseSync, tag: string) => void,
): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const journalPath = path.resolve("db/migrations/meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string }>;
  };
  for (const { tag } of journal.entries) {
    beforeMigration?.(sqlite, tag);
    const sqlText = readFileSync(path.resolve("db/migrations", `${tag}.sql`), "utf8");
    for (const statement of sqlText.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }
  return sqlite;
}
