import { formatAlarmLabel } from "@alarm/contracts";
import type { Db } from "../db/prisma.js";
import { serialiseDetails } from "../db/json.js";
import { serverEvents } from "../events/bus.js";
import { AppError } from "../lib/errors.js";
import type { NormalisedAlarmEvent } from "../webhooks/adapters/index.js";
import { allocateAlarmReference } from "./reference.js";

export type UnresolvedRecipient = {
  identifier: string;
  reason: "UNKNOWN_USER" | "INACTIVE_USER";
};

export type IngestResult = {
  alarmId: string;
  /**
   * The quotable code, e.g. `TANK01-20260813-07`.
   *
   * On a duplicate this is the code of the alarm that ALREADY held the event -
   * no new number is issued, so a retrying webhook cannot inflate a device's
   * daily count.
   */
  reference: string | null;
  duplicate: boolean;
  /** Which mechanism caught the duplicate, for the operations console. */
  duplicateReason?: "event_id" | "dedup_key";
  recipientUserIds: string[];
  /** Requested recipients that could not be mapped to an account. */
  unresolved: UnresolvedRecipient[];
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

/**
 * Resolves the recipients an adapter produced into internal user ids.
 *
 * Recipients that cannot be mapped do NOT fail the webhook. The alarm is stored
 * and delivered to everyone reachable, and each unmapped identifier is recorded
 * so it is visible rather than silent.
 *
 * Rejecting the whole alarm was the earlier behaviour. It was changed because a
 * single stale email in the customer's configuration would otherwise break the
 * entire alarm chain - reaching two of three managers beats reaching nobody,
 * PROVIDED the third failure is recorded loudly, which is what
 * alarm_unresolved_recipients and the recipient ledger together guarantee.
 */
async function resolveRecipients(
  db: Db,
  event: NormalisedAlarmEvent,
): Promise<{ resolved: string[]; unresolved: UnresolvedRecipient[] }> {
  const resolved = new Set<string>();
  const unresolved: UnresolvedRecipient[] = [];

  const classify = async (identifier: string, where: { id: string } | { email: string }) => {
    // Look up without the active filter so "deactivated" is distinguishable
    // from "never existed" - they need different fixes by different people.
    const user = await db.user.findUnique({ where, select: { id: true, active: true } });

    if (!user) {
      unresolved.push({ identifier, reason: "UNKNOWN_USER" });
      return;
    }
    if (!user.active) {
      unresolved.push({ identifier, reason: "INACTIVE_USER" });
      return;
    }
    resolved.add(user.id);
  };

  for (const id of event.recipientUserIds) {
    await classify(id, { id });
  }

  for (const email of event.recipientEmails) {
    await classify(email.trim().toLowerCase(), { email: email.trim().toLowerCase() });
  }

  return { resolved: [...resolved], unresolved };
}

/**
 * Persists an alarm idempotently.
 *
 * Two independent deduplication layers, because they catch different failures:
 *   1. (source, eventId) - the SAME event delivered twice, e.g. a webhook retry
 *      after a timeout where the first attempt actually succeeded.
 *   2. dedupKey          - DIFFERENT events that mean the same thing, e.g. a
 *      sensor re-reporting the same threshold breach every 30 seconds.
 *
 * The push is deliberately NOT sent here. The caller sends it after the
 * transaction commits, so a slow push provider can never hold a database
 * transaction open (README.md §11 trap 14).
 */
export async function ingestAlarmEvent(
  db: Db,
  input: { event: NormalisedAlarmEvent; payloadHash: string; requestId: string },
): Promise<IngestResult> {
  const { event, payloadHash, requestId } = input;

  const { resolved: recipientUserIds, unresolved } = await resolveRecipients(db, event);

  if (unresolved.length > 0) {
    serverEvents.emit({
      event: "recipient_unresolved",
      requestId,
      source: event.source,
      message: `${unresolved.length} 位指定收件人無法對應到帳號，該筆告警將只送給其餘收件人`,
      context: {
        eventId: event.eventId,
        unresolved: unresolved.map((entry) => `${entry.identifier} (${entry.reason})`),
        resolvedCount: recipientUserIds.length,
      },
    });
  }

  const existingEvent = await db.webhookEvent.findUnique({
    where: { source_eventId: { source: event.source, eventId: event.eventId } },
  });

  if (existingEvent?.alarmId) {
    // Fetched so the console can say WHICH alarm already holds this event.
    // "duplicate" on its own leaves the operator hunting; a code ends the hunt.
    const held = await db.alarm.findUnique({
      where: { id: existingEvent.alarmId },
      select: { reference: true, title: true },
    });

    serverEvents.emit({
      event: "webhook_duplicate",
      requestId,
      source: event.source,
      alarmId: existingEvent.alarmId,
      message: held
        ? `重複事件 eventId=${event.eventId}，未建立新告警（已記錄為 ${formatAlarmLabel(held.title, held.reference)}）`
        : `重複事件 eventId=${event.eventId}，未建立新告警`,
      context: {
        eventId: event.eventId,
        reference: held?.reference ?? null,
        // A retry that changed the body is worth surfacing: same event id but
        // different content usually means a bug in the source system.
        payloadChanged: existingEvent.payloadHash !== payloadHash,
      },
    });
    return {
      alarmId: existingEvent.alarmId,
      reference: held?.reference ?? null,
      duplicate: true,
      duplicateReason: "event_id",
      recipientUserIds,
      unresolved,
    };
  }

  if (event.dedupKey) {
    const existingAlarm = await db.alarm.findUnique({ where: { dedupKey: event.dedupKey } });
    if (existingAlarm) {
      await db.webhookEvent.upsert({
        where: { source_eventId: { source: event.source, eventId: event.eventId } },
        create: {
          source: event.source,
          eventId: event.eventId,
          payloadHash,
          alarmId: existingAlarm.id,
          processedAt: new Date(),
        },
        update: { alarmId: existingAlarm.id, processedAt: new Date() },
      });

      serverEvents.emit({
        event: "alarm_duplicate",
        requestId,
        source: event.source,
        alarmId: existingAlarm.id,
        message: `dedupKey 命中既有告警 ${formatAlarmLabel(existingAlarm.title, existingAlarm.reference)}，未重複通知`,
        context: {
          dedupKey: event.dedupKey,
          eventId: event.eventId,
          // No new number was issued: a flapping sensor must not be able to
          // consume its device's daily sequence forty times before dawn.
          reference: existingAlarm.reference,
        },
      });

      return {
        alarmId: existingAlarm.id,
        reference: existingAlarm.reference,
        duplicate: true,
        duplicateReason: "dedup_key",
        recipientUserIds,
        unresolved,
      };
    }
  }

  try {
    const created = await db.$transaction(async (tx) => {
      const webhookEvent = await tx.webhookEvent.create({
        data: { source: event.source, eventId: event.eventId, payloadHash },
      });

      /**
       * Numbered inside the transaction, so a failed insert cannot burn a
       * sequence value. Gaps in a per-device daily sequence are indistinguishable
       * from deleted alarms to anyone auditing it later.
       */
      const { reference } = await allocateAlarmReference(tx, {
        deviceId: event.deviceId,
        occurredAt: event.occurredAt,
      });

      const alarm = await tx.alarm.create({
        data: {
          source: event.source,
          sourceEventId: event.eventId,
          dedupKey: event.dedupKey,
          severity: event.severity,
          title: event.title,
          reference,
          body: event.body,
          details: serialiseDetails(event.details),
          occurredAt: event.occurredAt,
        },
      });

      await tx.alarmRecipient.createMany({
        data: recipientUserIds.map((userId) => ({ alarmId: alarm.id, userId })),
      });

      if (unresolved.length > 0) {
        await tx.alarmUnresolvedRecipient.createMany({
          data: unresolved.map((entry) => ({
            alarmId: alarm.id,
            identifier: entry.identifier,
            reason: entry.reason,
          })),
        });
      }

      await tx.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { alarmId: alarm.id, processedAt: new Date() },
      });

      return { id: alarm.id, reference };
    });

    const { id: alarmId, reference } = created;

    serverEvents.emit({
      event: "alarm_created",
      requestId,
      source: event.source,
      alarmId,
      message: `[${event.severity}] ${formatAlarmLabel(event.title, reference)}`,
      context: {
        eventId: event.eventId,
        dedupKey: event.dedupKey,
        reference,
        recipientCount: recipientUserIds.length,
        unresolvedCount: unresolved.length,
      },
    });

    if (recipientUserIds.length === 0) {
      /**
       * The alarm is still stored - losing it would destroy the only evidence
       * that the source system tried to raise it. But nobody can be notified,
       * which is an operational emergency rather than a routine outcome.
       */
      serverEvents.emit({
        event: "alarm_no_recipients",
        requestId,
        source: event.source,
        alarmId,
        message: `告警 ${formatAlarmLabel(event.title, reference)} 已建立，但沒有任何可通知的收件人 — 沒有人會收到這則告警`,
        context: { eventId: event.eventId, reference, unresolvedCount: unresolved.length },
      });
    }

    return { alarmId, reference, duplicate: false, recipientUserIds, unresolved };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    /**
     * Two concurrent deliveries of the same event raced past the pre-checks
     * above and one lost at the unique index. That is the index doing its job,
     * not an error - resolve the winner's alarm and report a duplicate.
     */
    const winner = await db.webhookEvent.findUnique({
      where: { source_eventId: { source: event.source, eventId: event.eventId } },
    });

    const dedupWinner = event.dedupKey
      ? await db.alarm.findUnique({ where: { dedupKey: event.dedupKey } })
      : null;

    const alarmId = winner?.alarmId ?? dedupWinner?.id;

    /**
     * The loser's transaction rolled back, INCLUDING its sequence increment, so
     * the number it took is returned rather than left as a hole. The winner's
     * code is the one that exists - report that, never a locally computed guess.
     */
    const raced = alarmId
      ? ((await db.alarm.findUnique({ where: { id: alarmId }, select: { reference: true } }))
          ?.reference ?? null)
      : null;

    if (!alarmId) {
      // The constraint fired but neither row is visible: not a duplicate we can
      // explain, so surface it rather than pretending the alarm was delivered.
      throw error;
    }

    serverEvents.emit({
      event: "webhook_duplicate",
      requestId,
      source: event.source,
      alarmId,
      message: `並發重複事件由唯一索引攔截：eventId=${event.eventId}`,
      context: { eventId: event.eventId, dedupKey: event.dedupKey, reference: raced, raced: true },
    });

    return {
      alarmId,
      reference: raced,
      duplicate: true,
      duplicateReason: winner?.alarmId ? "event_id" : "dedup_key",
      recipientUserIds,
      unresolved,
    };
  }
}
