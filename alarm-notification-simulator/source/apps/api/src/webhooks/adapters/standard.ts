import { alarmWebhookSchema, coerceDeviceId, toAlarmSeverity } from "@alarm/contracts";
import type { NormalisedAlarmEvent, SourceAdapter } from "./types.js";

/**
 * The contract defined in README.md §7.4. Used by the simulated operations
 * server and by any customer system willing to emit our format directly.
 */
export const standardAdapter: SourceAdapter = {
  name: "standard",
  description: "Canonical alarm webhook format (README.md §7.4)",

  normalise(payload: unknown): NormalisedAlarmEvent {
    const parsed = alarmWebhookSchema.parse(payload);

    return {
      eventId: parsed.eventId,
      source: parsed.source,
      severity: toAlarmSeverity(parsed.severity),
      title: parsed.title,
      body: parsed.body,
      occurredAt: new Date(parsed.occurredAt),
      /**
       * Declared field first, then the legacy convention of putting it in
       * `details`, so senders already doing that keep working. New senders
       * should use the top-level field - it is the one the schema documents.
       */
      deviceId: coerceDeviceId(parsed.deviceId) ?? coerceDeviceId(parsed.details?.deviceId),
      dedupKey: parsed.dedupKey ?? null,
      recipientUserIds: parsed.recipientUserIds,
      recipientEmails: [],
      details: parsed.details,
    };
  },
};
