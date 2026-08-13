import type { AlarmSeverity } from "@alarm/contracts";

/**
 * The canonical shape the alarm pipeline consumes. Everything upstream of this
 * type is source-specific; everything downstream is not.
 */
export type NormalisedAlarmEvent = {
  eventId: string;
  source: string;
  severity: AlarmSeverity;
  title: string;
  body: string;
  occurredAt: Date;
  /**
   * Which piece of equipment this alarm is about, or null if it names none.
   *
   * REQUIRED, AND DELIBERATELY NOT OPTIONAL. It drives the per-device alarm
   * reference code, so every adapter author has to make a decision about it and
   * TypeScript will not let them skip the question.
   *
   * It used to be read out of the free-form `details` bag by convention. That
   * failed silently in the worst possible way: a source spelling the field
   * `device`, `equipment`, `assetId` or `tag` - or sending a number - produced
   * no error and no log line, but every alarm was numbered as `SYS_Manual_Test`,
   * all devices shared one counter, and every real incident was labelled a
   * manual test. Nothing looked wrong; the codes were still well-formed.
   *
   * Map it explicitly here, in the adapter, using coerceDeviceId() from
   * @alarm/contracts. That is what this seam exists for.
   */
  deviceId: string | null;
  dedupKey: string | null;
  /** Recipients identified directly by internal user id. */
  recipientUserIds: string[];
  /** Recipients identified by email; resolved to user ids during ingest. */
  recipientEmails: string[];
  details: Record<string, unknown>;
};

export type SourceAdapter = {
  /** Value clients send in the x-source-format header. */
  readonly name: string;
  readonly description: string;
  normalise(payload: unknown): NormalisedAlarmEvent;
};
