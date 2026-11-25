import {
  DUE_SOON_WINDOW_MS,
  formatTaipeiDateTime,
  getDeadlineState,
  isProjectOverdue,
  isWorkspaceLate,
  parseProjectDueDate,
  toTaipeiIsoString,
} from "@modules/projects";
import { assert, test } from "vite-plus/test";

test("parseProjectDueDate validates Taipei calendar dates and rejects invalid inputs", () => {
  assert.strictEqual(
    parseProjectDueDate("2026-11-25 23:59"),
    Date.parse("2026-11-25T23:59:00+08:00"),
  );
  assert.strictEqual(parseProjectDueDate(""), null);
  assert.strictEqual(parseProjectDueDate("2026-02-30 12:00"), null);
  assert.strictEqual(parseProjectDueDate("2026-11-25T23:59"), null);
});

test("deadline state helpers classify open, dueSoon, overdue, and empty deadlines", () => {
  const dueDate = "2026-11-25 23:59";
  const dueMs = Date.parse("2026-11-25T23:59:00+08:00");
  assert.strictEqual(getDeadlineState("", dueMs), "none");
  assert.strictEqual(isProjectOverdue("", dueMs), false);
  assert.strictEqual(getDeadlineState(dueDate, dueMs - DUE_SOON_WINDOW_MS - 1), "open");
  assert.strictEqual(getDeadlineState(dueDate, dueMs - DUE_SOON_WINDOW_MS), "dueSoon");
  assert.strictEqual(getDeadlineState(dueDate, dueMs), "dueSoon");
  assert.strictEqual(isProjectOverdue(dueDate, dueMs), false);
  assert.strictEqual(getDeadlineState(dueDate, dueMs + 1), "overdue");
  assert.strictEqual(isProjectOverdue(dueDate, dueMs + 1), true);
});

test("isWorkspaceLate and Taipei formatters handle null and valid timestamps", () => {
  const dueDate = "2026-11-25 23:59";
  const dueMs = Date.parse("2026-11-25T23:59:00+08:00");
  assert.strictEqual(isWorkspaceLate(dueDate, null), false);
  assert.strictEqual(isWorkspaceLate(dueDate, dueMs), false);
  assert.strictEqual(isWorkspaceLate(dueDate, dueMs + 1), true);
  assert.strictEqual(isWorkspaceLate("", dueMs + 1), false);

  const sample = Date.parse("2026-11-25T00:05:00+08:00");
  assert.strictEqual(formatTaipeiDateTime(sample), "2026-11-25 00:05");
  assert.strictEqual(toTaipeiIsoString(sample), "2026-11-25T00:05:00+08:00");
});
