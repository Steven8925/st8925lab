import {
  ALARM_REFERENCE_FALLBACK_DEVICE_KEY,
  alarmDateKey,
  coerceDeviceId,
  composeAlarmReference,
  normaliseDeviceKey,
  type AlarmReferenceParts,
} from "@alarm/contracts";
import { config } from "../config.js";
import type { Db } from "../db/prisma.js";

/** Any client or transaction handle. Allocation must run inside the alarm's tx. */
type SequenceClient = Pick<Db, "alarmSequence">;

/**
 * Which device an alarm belongs to, for numbering purposes.
 *
 * Takes the DECLARED `NormalisedAlarmEvent.deviceId`, not a lookup inside the
 * free-form `details` bag. That was the earlier design and it failed silently:
 * a source spelling the field differently produced no error, and every alarm
 * was numbered as a device-less manual test. Making it a required field on the
 * adapter contract turns that into a compile error instead.
 *
 * With no device it returns `SYS_Manual_Test` rather than deriving a key from
 * the source name. The source name produced codes like
 * `OPERATIONSSERVER-20260813-02` - long, and it invited the reader to hunt for
 * equipment called "OPERATIONSSERVER". Nothing is lost: which system raised the
 * alarm is already recorded in `Alarm.source` and shown in the ledger.
 *
 * Two devices normalising to the same key merely share a counter - the sequence
 * keeps every code distinct, so the cost is readability, never uniqueness.
 */
export function deviceKeyForAlarm(deviceId: string | null | undefined): string {
  const coerced = coerceDeviceId(deviceId);
  return coerced ? normaliseDeviceKey(coerced) : ALARM_REFERENCE_FALLBACK_DEVICE_KEY;
}

/** The calendar day an alarm is filed under, in the one system-wide zone. */
export function dateKeyForAlarm(occurredAt: Date): string {
  return alarmDateKey(occurredAt, config.ALARM_REFERENCE_TIMEZONE);
}

/**
 * Issues the next code for one device on one day.
 *
 * MUST BE CALLED INSIDE THE SAME TRANSACTION that creates the alarm. Allocating
 * outside it would burn a number whenever the insert then fails, leaving gaps
 * that look - to anyone auditing a sequence - exactly like deleted alarms.
 *
 * The date comes from `occurredAt`, not from the clock. A row that reaches us at
 * 00:05 for a condition that happened at 23:58 belongs to yesterday: the code
 * names when the tank overheated, not when our poller got round to it. This is
 * also why the counter is keyed rather than reset - late arrivals continue
 * yesterday's numbering instead of colliding with it.
 *
 * PORTABILITY: on SQLite the single-writer lock serialises this. On PostgreSQL
 * Prisma compiles upsert to INSERT ... ON CONFLICT DO UPDATE, which is atomic,
 * but that has not been exercised here - it is on the pre-production checklist
 * alongside the concurrent-deduplication retest.
 */
export async function allocateAlarmReference(
  client: SequenceClient,
  input: { deviceId: string | null | undefined; occurredAt: Date },
): Promise<{ reference: string; parts: AlarmReferenceParts }> {
  const deviceKey = deviceKeyForAlarm(input.deviceId);
  const dateKey = dateKeyForAlarm(input.occurredAt);

  const row = await client.alarmSequence.upsert({
    where: { deviceKey_dateKey: { deviceKey, dateKey } },
    create: { deviceKey, dateKey, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });

  const parts: AlarmReferenceParts = { deviceKey, dateKey, sequence: row.lastSeq };
  return { reference: composeAlarmReference(parts), parts };
}
