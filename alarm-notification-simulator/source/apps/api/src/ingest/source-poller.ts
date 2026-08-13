import { ingestAlarmEvent } from "../alarms/ingest.js";
import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import type { PushDispatcher } from "../notifications/dispatcher.js";
import { sensorThresholdV1Adapter } from "../webhooks/adapters/sensor-threshold-v1.js";
import { hashPayload } from "../webhooks/signature.js";
import type { SourceEventReader } from "./source-reader.js";

export type SourcePollerOptions = {
  intervalMs: number;
  /**
   * Who receives alarms from this source.
   *
   * FIXED FOR v1: every active account. The customer's table has no notion of
   * our users, so routing is our decision - and until the real routing rules are
   * known (by site? by team? by shift?), notifying everyone is the honest
   * placeholder. This function is the single place those rules will land.
   */
  resolveRecipients?: (db: Db) => Promise<string[]>;
};

async function allActiveUsers(db: Db): Promise<string[]> {
  const users = await db.user.findMany({ where: { active: true }, select: { id: true } });
  return users.map((user) => user.id);
}

export type PollSummary = {
  fetched: number;
  created: number;
  duplicates: number;
  failed: number;
};

/**
 * Pulls threshold rows from a customer source and feeds them into the alarm
 * pipeline.
 *
 * The polling interval is the floor on alarm latency: a red-light reading can
 * sit unnoticed for up to one interval. That is the price of a source that
 * cannot push, and it is why the interval is configuration rather than a
 * constant.
 */
export class SourceEventPoller {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly resolveRecipients: (db: Db) => Promise<string[]>;

  constructor(
    private readonly db: Db,
    private readonly reader: SourceEventReader,
    private readonly options: SourcePollerOptions,
    private readonly pushDispatcher?: PushDispatcher,
  ) {
    this.resolveRecipients = options.resolveRecipients ?? allActiveUsers;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.pollOnce(), this.options.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async pollOnce(): Promise<PollSummary> {
    const summary: PollSummary = { fetched: 0, created: 0, duplicates: 0, failed: 0 };

    // Overlapping runs would read the same rows twice and double the work the
    // dedup layer has to absorb. A slow poll simply skips its turn.
    if (this.running) return summary;
    this.running = true;

    try {
      let rows: unknown[];
      try {
        rows = await this.reader.fetchPending();
      } catch (error) {
        serverEvents.emit({
          event: "source_poll_failed",
          source: this.reader.name,
          message: `無法讀取來源資料：${error instanceof Error ? error.message : String(error)}`,
        });
        summary.failed += 1;
        return summary;
      }

      summary.fetched = rows.length;
      if (rows.length === 0) return summary;

      const recipientUserIds = await this.resolveRecipients(this.db);

      for (const row of rows) {
        try {
          const normalised = sensorThresholdV1Adapter.normalise(row);

          serverEvents.emit({
            event: "source_row_picked_up",
            source: normalised.source,
            /**
             * The device is named explicitly because no reference code exists
             * yet - numbering happens at ingest, one step later. Saying
             * `水溫 紅燈告警` alone here would leave the operator unable to tell
             * which tank was picked up.
             */
            message: `自客戶資料庫取件：${normalised.title}（${String(normalised.details.deviceId ?? normalised.source)}）`,
            context: {
              eventId: normalised.eventId,
              deviceId: normalised.details.deviceId,
              severity: normalised.severity,
              value: normalised.details.value,
              threshold: normalised.details.threshold,
            },
          });

          const result = await ingestAlarmEvent(this.db, {
            // Recipients come from our policy, not from the customer's row.
            event: { ...normalised, recipientUserIds },
            payloadHash: hashPayload(JSON.stringify(row)),
            requestId: `poll-${normalised.eventId}`,
          });

          if (result.duplicate) {
            summary.duplicates += 1;
            continue;
          }

          summary.created += 1;

          if (this.pushDispatcher) {
            await this.pushDispatcher
              .sendForAlarm(result.alarmId, `poll-${normalised.eventId}`)
              .catch(() => {
                // Recorded as PushDelivery rows; one bad send must not abort the
                // rest of the batch.
              });
          }
        } catch (error) {
          summary.failed += 1;
          serverEvents.emit({
            event: "source_row_rejected",
            source: this.reader.name,
            message: `來源資料列不符合預期結構，已略過：${
              error instanceof Error ? error.message : String(error)
            }`,
            context: { row: JSON.stringify(row).slice(0, 300) },
          });
        }
      }

      return summary;
    } finally {
      this.running = false;
    }
  }
}
