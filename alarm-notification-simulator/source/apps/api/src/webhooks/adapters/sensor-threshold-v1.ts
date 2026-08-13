import type { AlarmSeverity } from "@alarm/contracts";
import { z } from "zod";
import type { NormalisedAlarmEvent, SourceAdapter } from "./types.js";

/**
 * The customer's threshold-alarm table row.
 *
 * This schema describes SOMEBODY ELSE'S database, which is why it lives here in
 * the adapter and not in @alarm/contracts: it can change without our agreement,
 * and the adapter is the single place that must then be updated. Nothing
 * downstream of normalise() knows this shape exists.
 */
const sourceRowSchema = z.object({
  id: z.coerce.number().int(),
  deviceId: z.string().min(1).max(100),
  metric: z.string().min(1).max(100),
  metricLabel: z.string().min(1).max(100),
  value: z.coerce.number(),
  unit: z.string().max(20),
  /** 黃燈 warning / 紅燈 alarm. */
  level: z.enum(["YELLOW", "RED"]),
  threshold: z.coerce.number(),
  message: z.string().min(1).max(2000),
  createdAt: z.string(),
});

export type SourceRow = z.infer<typeof sourceRowSchema>;

const LEVEL_TO_SEVERITY: Record<SourceRow["level"], AlarmSeverity> = {
  YELLOW: "WARNING",
  RED: "CRITICAL",
};

/** Floors a timestamp to a 5-minute bucket, matching the operations server. */
function timeBucket(at: Date): string {
  const floored = new Date(at);
  floored.setSeconds(0, 0);
  floored.setMinutes(Math.floor(floored.getMinutes() / 5) * 5);
  return floored.toISOString().slice(0, 16);
}

export const SENSOR_SOURCE_NAME = "customer-threshold-db";

export const sensorThresholdV1Adapter: SourceAdapter = {
  name: "sensor-threshold-v1",
  description: "Customer threshold table: device + metric + value + YELLOW/RED light",

  normalise(payload: unknown): NormalisedAlarmEvent {
    const row = sourceRowSchema.parse(payload);
    const severity = LEVEL_TO_SEVERITY[row.level];
    const occurredAt = new Date(row.createdAt);

    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error(`createdAt is not a valid timestamp: ${row.createdAt}`);
    }

    return {
      /**
       * The row's identity: its primary key AND its creation time.
       *
       * The key alone would be enough while the source table lives forever, and
       * re-reading the same row stays harmless either way because both parts are
       * stable per row. The timestamp is included because an id space can be
       * reset - a truncated or recreated table starts again at 1, and a bare
       * `row-1` would then collide with an id we ingested months ago and be
       * silently suppressed as a duplicate. Suppressing a real alarm is far
       * worse than carrying a longer key.
       */
      eventId: `row-${row.id}-${occurredAt.getTime()}`,
      source: SENSOR_SOURCE_NAME,
      severity,
      /**
       * The device is NOT repeated here.
       *
       * It used to read `水溫 紅燈告警（TANK-01）`, but every display now appends
       * the reference code - `水溫 紅燈告警 (TANK01-20260813-07)` - which already
       * names the device. Keeping both produced
       * `水溫 紅燈告警（TANK-01）(TANK01-20260813-07)`: the same fact twice, in
       * two spellings, which invites the reader to wonder whether they differ.
       */
      title: `${row.metricLabel} ${row.level === "RED" ? "紅燈告警" : "黃燈警告"}`,
      body: row.message,
      occurredAt,
      /** Drives the reference code. This source always names its device. */
      deviceId: row.deviceId,
      /**
       * The level is part of the key ON PURPOSE.
       *
       * Without it, an escalation from yellow to red inside the same 5-minute
       * bucket would be swallowed as a duplicate of the yellow - suppressing
       * precisely the alarm that matters most.
       */
      dedupKey: `${row.deviceId}:${row.metric}:${row.level}:${timeBucket(occurredAt)}`,
      /**
       * The customer's table has no idea who our users are, so recipients are
       * resolved by the poller's policy rather than carried in the row.
       */
      recipientUserIds: [],
      recipientEmails: [],
      details: {
        deviceId: row.deviceId,
        metric: row.metric,
        value: row.value,
        unit: row.unit,
        threshold: row.threshold,
        level: row.level,
        sourceRowId: row.id,
      },
    };
  },
};
