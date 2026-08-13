/**
 * 告警編號 / Alarm reference codes: `DEVICEKEY-YYYYMMDD-NNN`
 *
 *   TANK01-20260811-99      TANK02-20260813-1001
 *
 * A human-quotable name for one alarm. The alarm's real primary key is a UUID,
 * which is correct for machines and useless on a phone call at 3am - nobody
 * reads `9f2c1a7e-…` to a duty manager. The reference is what a person says out
 * loud, writes on a handover sheet, and searches for afterwards.
 *
 * THREE DECISIONS THAT MATTER
 *
 * 1. The sequence is per device AND per day. Two counters that never interact:
 *    TANK-01's 99th alarm today and TANK-02's 99th alarm today are different
 *    codes because the device key differs. A single global counter would make
 *    "how many times did the tank alarm today" unanswerable from the codes.
 *
 * 2. The daily reset is a CONSEQUENCE OF THE KEY, not a scheduled job. The
 *    counter is stored per (deviceKey, dateKey), so the first alarm after
 *    midnight simply finds no row for the new date and starts at 1. A cron job
 *    that resets counters at 00:00 is one more thing that can fail at midnight,
 *    silently, on the one night it matters.
 *
 * 3. The date comes from ONE system-wide timezone, never from the reader's
 *    handset. If the code were rendered per device, the same alarm would be
 *    called ...-20260813-01 by a manager in Taipei and ...-20260812-01 by a
 *    vendor in London, and the two would not be able to discuss it.
 *
 * The zone is stated in the notification body instead (see the API's
 * notifications/format.ts), which is where a reader can actually act on it.
 */

/** Minimum printed width of the sequence. Wider values print in full. */
export const ALARM_SEQUENCE_MIN_DIGITS = 2;

/**
 * Used when an alarm carries no device at all, e.g. a hand-fired console webhook.
 *
 * Deliberately mixed-case and underscored, which **no normalised device key can
 * ever be** (normaliseDeviceKey uppercases and strips underscores). A reader
 * seeing `SYS_Manual_Test-20260813-02` therefore knows at a glance that this
 * alarm named no device, rather than wondering which piece of equipment
 * "SYS" is.
 *
 * ⚠️ It also asserts the alarm was a manual test. That is true for every caller
 * that reaches it today (only the console's hand-fired scenarios omit a device;
 * the sensor path always carries one). If Phase B ever introduces a REAL source
 * that legitimately raises device-less alarms, this key becomes a lie and must
 * be revisited - see PROMPT.md §4.5.
 */
export const ALARM_REFERENCE_FALLBACK_DEVICE_KEY = "SYS_Manual_Test";

/**
 * Longest device key kept. Pathological source ids are truncated rather than
 * producing a code too long to read aloud.
 *
 * Truncation cannot collide two alarms: if two devices normalise to the same
 * key they merely SHARE a counter, and the sequence still makes every code
 * distinct. It costs readability, never uniqueness.
 */
export const ALARM_DEVICE_KEY_MAX_LENGTH = 32;

/**
 * Turns a source device id into the code's first segment: `TANK-01` -> `TANK01`.
 *
 * Only the hyphen and other separators are removed, because the hyphen is the
 * code's own field separator - `TANK-01-20260813-01` has four segments and
 * cannot be parsed back. Letters and digits of any script are kept: stripping
 * everything non-ASCII would collapse every CJK-named device onto the fallback
 * key and make their codes unreadable.
 */
export function normaliseDeviceKey(raw: string | null | undefined): string {
  if (typeof raw !== "string") return ALARM_REFERENCE_FALLBACK_DEVICE_KEY;

  const stripped = raw
    // Drop separators, whitespace and punctuation; keep letters and numbers.
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toUpperCase()
    .slice(0, ALARM_DEVICE_KEY_MAX_LENGTH);

  return stripped.length > 0 ? stripped : ALARM_REFERENCE_FALLBACK_DEVICE_KEY;
}

/**
 * Coerces whatever a source called its device identifier into a usable string.
 *
 * Numbers are accepted because asset ids are very often numeric (`deviceId:
 * 12345`). Rejecting them would send every alarm from such a source to the
 * device-less fallback - numbered as a manual test, all sharing one counter,
 * with nothing logged and codes that still look perfectly well-formed.
 *
 * Returns null for anything that cannot honestly be read as an identifier, so
 * the caller falls back deliberately rather than on a stringified `[object
 * Object]`.
 */
export function coerceDeviceId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "bigint") {
    return String(value);
  }
  return null;
}

/**
 * `YYYYMMDD` for the given instant, in the reference timezone.
 *
 * Falls back to the host's local date on an unusable zone rather than throwing.
 * A misconfigured zone must not be able to stop an alarm from being recorded -
 * the wrong date on a code is recoverable, a dropped alarm is not. The zone is
 * validated at startup so a bad value is loud there instead of silent here.
 */
export function alarmDateKey(at: Date, timeZone?: string | null): string {
  const parts = dateParts(at, timeZone ?? undefined) ?? dateParts(at, undefined);
  if (!parts) {
    // Unreachable in practice: the host's own zone always formats.
    throw new Error("Unable to determine a calendar date for the alarm reference");
  }
  return `${parts.year}${parts.month}${parts.day}`;
}

function dateParts(
  at: Date,
  timeZone: string | undefined,
): { year: string; month: string; day: string } | null {
  try {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at);

    const pick = (type: "year" | "month" | "day") =>
      formatted.find((part) => part.type === type)?.value;

    const year = pick("year");
    const month = pick("month");
    const day = pick("day");

    if (!year || !month || !day) return null;
    return { year, month, day };
  } catch {
    return null;
  }
}

/**
 * `01`, `99`, `100`, `1001` - padded to two digits for a tidy column, then
 * allowed to grow. Clamping at two digits would either wrap (two alarms sharing
 * a code) or stall (the 100th alarm of the day having no code at all).
 */
export function formatAlarmSequence(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Alarm sequence must be a positive integer, received: ${sequence}`);
  }
  return String(sequence).padStart(ALARM_SEQUENCE_MIN_DIGITS, "0");
}

export type AlarmReferenceParts = {
  deviceKey: string;
  /** YYYYMMDD in the reference timezone. */
  dateKey: string;
  sequence: number;
};

export function composeAlarmReference(parts: AlarmReferenceParts): string {
  return `${parts.deviceKey}-${parts.dateKey}-${formatAlarmSequence(parts.sequence)}`;
}

/**
 * Reads a code back apart, for search boxes and log greps. Null if malformed.
 *
 * The first segment admits `_` as well as letters and digits: the fallback key
 * `SYS_Manual_Test` contains underscores, and a parser that rejected its own
 * fallback would silently make every device-less alarm's code unreadable. `_` is
 * safe to admit precisely because it is not the `-` field separator.
 */
export function parseAlarmReference(reference: string): AlarmReferenceParts | null {
  const match = /^([\p{L}\p{N}_]+)-(\d{8})-(\d+)$/u.exec(reference.trim());
  if (!match) return null;

  const [, deviceKey, dateKey, sequence] = match;
  if (!deviceKey || !dateKey || !sequence) return null;

  const parsed = Number(sequence);
  if (!Number.isInteger(parsed) || parsed < 1) return null;

  return { deviceKey, dateKey, sequence: parsed };
}

/**
 * The canonical one-LINE name: `水溫 紅燈告警 (TANK01-20260813-01)`.
 *
 * Used wherever an alarm has to be named inside a single string and there is no
 * room to lay out two fields: the push title, every server event message, and
 * the operations server's own log notes. The React panels render the same two
 * parts structurally instead (title element + code element), because there they
 * can be styled and truncated independently.
 *
 * Alarms stored before the numbering scheme existed have no reference and render
 * as the bare title. A fabricated code in an audit trail is worse than no code -
 * it would be quoted, and it would match nothing.
 */
export function formatAlarmLabel(title: string, reference?: string | null): string {
  return reference ? `${title} (${reference})` : title;
}
