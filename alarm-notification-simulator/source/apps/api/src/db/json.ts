/**
 * SQLite has no JSON column type, so `Alarm.details` is TEXT. These helpers are
 * the only place that knows it. When the datasource moves to PostgreSQL the
 * column can become jsonb and only this file changes.
 */

export function serialiseDetails(details: Record<string, unknown> | undefined): string {
  if (!details) return "{}";
  return JSON.stringify(details);
}

export function parseDetails(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    // A malformed row must not take down an alarm list request.
    return {};
  }
}
