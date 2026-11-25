export const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
export const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

export type DeadlineState = "none" | "open" | "dueSoon" | "overdue";

/** Parse a `YYYY-MM-DD HH:mm` Taipei (UTC+8) deadline string into epoch milliseconds. */
export function parseProjectDueDate(dueDate: string): number | null {
  const trimmed = dueDate.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match;
  const isoMinute = `${y}-${m}-${d}T${hh}:${mm}`;
  const utc = new Date(isoMinute + ":00Z");
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 16) !== isoMinute) {
    return null;
  }
  return Date.parse(isoMinute + ":00+08:00");
}

export function isProjectOverdue(dueDate: string, now = Date.now()): boolean {
  const due = parseProjectDueDate(dueDate);
  return due !== null && now > due;
}

export function getDeadlineState(dueDate: string, now = Date.now()): DeadlineState {
  const due = parseProjectDueDate(dueDate);
  if (due === null) return "none";
  if (now > due) return "overdue";
  if (due - now <= DUE_SOON_WINDOW_MS) return "dueSoon";
  return "open";
}

export function isWorkspaceLate(dueDate: string, updatedAt: number | null | undefined): boolean {
  if (updatedAt == null) return false;
  const due = parseProjectDueDate(dueDate);
  return due !== null && updatedAt > due;
}

function taipeiParts(timestamp: number) {
  const d = new Date(timestamp + TAIPEI_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    year: String(d.getUTCFullYear()).padStart(4, "0"),
    month: pad(d.getUTCMonth() + 1),
    day: pad(d.getUTCDate()),
    hours: pad(d.getUTCHours()),
    minutes: pad(d.getUTCMinutes()),
  };
}

/** Format epoch milliseconds as deterministic `YYYY-MM-DD HH:mm` in Taipei time (UTC+8). */
export function formatTaipeiDateTime(timestamp: number): string {
  const { year, month, day, hours, minutes } = taipeiParts(timestamp);
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/** Format a `YYYY-MM-DD HH:mm` Taipei deadline for `<input type="datetime-local">`. */
export function toDueDateInputValue(dueDate: string): string {
  return dueDate.replace(" ", "T");
}

/** Format a `YYYY-MM-DD HH:mm` Taipei deadline as an ISO-8601 timestamp with `+08:00`. */
export function toDueDateIsoString(dueDate: string): string {
  return `${toDueDateInputValue(dueDate)}:00+08:00`;
}

export function toTaipeiIsoString(timestamp: number): string {
  const { year, month, day, hours, minutes } = taipeiParts(timestamp);
  return `${year}-${month}-${day}T${hours}:${minutes}:00+08:00`;
}
