import { coerceDeviceId, type AlarmSeverity } from "@alarm/contracts";
import { z } from "zod";
import type { NormalisedAlarmEvent, SourceAdapter } from "./types.js";

/**
 * WORKED EXAMPLE / 範例轉接器
 *
 * This models a customer operations server that emits a different shape from
 * our canonical format: numeric severity levels, a Unix timestamp, and
 * recipients identified by email rather than by our internal user id.
 *
 * It exists to prove the adapter seam actually translates - so that when the
 * customer's real event format is known (README.md §17 questions 1-2), adding
 * support is a new file here rather than a change to the alarm pipeline.
 */
const legacySchema = z.object({
  id: z.string().min(1).max(200),
  system: z.string().min(1).max(100),
  /** 1 = informational, 2 = warning, 3 = critical. */
  level: z.coerce.number().int().min(1).max(3),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(2000),
  /** Unix seconds, Unix milliseconds, or an ISO-8601 string. */
  ts: z.union([z.number(), z.string()]),
  notify: z.array(z.string().email()).min(1).max(100),
  meta: z.record(z.unknown()).optional(),
});

const LEVEL_TO_SEVERITY: Record<number, AlarmSeverity> = {
  1: "INFO",
  2: "WARNING",
  3: "CRITICAL",
};

function parseTimestamp(value: number | string): Date {
  if (typeof value === "number") {
    // Below this threshold the value cannot plausibly be milliseconds since
    // the epoch (it would be January 1970), so treat it as seconds.
    const millis = value < 1e11 ? value * 1000 : value;
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) throw new Error("ts is not a valid timestamp");
    return date;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("ts is not a valid ISO-8601 timestamp");
  return date;
}

export const legacyOpsV1Adapter: SourceAdapter = {
  name: "legacy-ops-v1",
  description: "Example legacy format: numeric level, Unix ts, recipients by email",

  normalise(payload: unknown): NormalisedAlarmEvent {
    const parsed = legacySchema.parse(payload);
    const severity = LEVEL_TO_SEVERITY[parsed.level];

    if (!severity) {
      throw new Error(`Unmapped severity level: ${parsed.level}`);
    }

    return {
      eventId: parsed.id,
      source: parsed.system,
      severity,
      title: parsed.subject,
      body: parsed.text,
      occurredAt: parseTimestamp(parsed.ts),
      /**
       * THE POINT OF THIS ADAPTER, in one line.
       *
       * This format does not have a `deviceId`; it buries the equipment name in
       * `meta` under whatever the vendor felt like calling it. Mapping it here
       * is exactly the work the adapter seam exists to do — and skipping it is
       * how every alarm from a source like this would end up numbered as a
       * device-less manual test without a single error being raised.
       *
       * `equipment` is checked as well as `device` because vendors differ, and
       * numeric asset ids are coerced by coerceDeviceId().
       */
      deviceId:
        coerceDeviceId(parsed.meta?.device) ??
        coerceDeviceId(parsed.meta?.equipment) ??
        coerceDeviceId(parsed.meta?.deviceId),
      // This format carries no deduplication key. Synthesising one from the
      // subject line would be worse than having none: two genuinely different
      // alarms sharing a subject would silently suppress each other.
      dedupKey: null,
      recipientUserIds: [],
      recipientEmails: parsed.notify,
      details: parsed.meta ?? {},
    };
  },
};
