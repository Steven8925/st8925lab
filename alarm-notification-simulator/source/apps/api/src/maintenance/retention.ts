import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";

export type RetentionResult = {
  /** Null when retention is disabled, so callers can say so rather than "0". */
  cutoff: Date | null;
  alarms: number;
  webhookEvents: number;
};

/**
 * Deletes simulation data older than the retention window.
 *
 * WHY THIS EXISTS AT ALL: the console header tells the operator that test data
 * is kept for only the last few days. A claim like that has to be enforced by
 * code, not by a comment - an interface that states a retention policy nobody
 * implements is exactly the defect this project spent a session removing from
 * its own backup documentation.
 *
 * WHAT IS DELETED
 *   alarms          by `createdAt` - when we stored it, which is what "資訊與
 *                   紀錄" means to someone looking at the console. Their
 *                   recipients, reads, push deliveries and unresolved entries
 *                   follow via ON DELETE CASCADE.
 *   webhook_events  by `receivedAt`. These do NOT cascade: the column pointing
 *                   at an alarm is a plain String with no foreign key, so
 *                   deleting alarms alone would leave the idempotency table
 *                   growing forever.
 *
 * WHAT IS DELIBERATELY NOT DELETED
 *   alarm_sequences  The per-device daily counters. Deleting one lets the next
 *                    alarm for that device and date restart at 01 and reissue a
 *                    code an existing alarm may still hold - a unique-constraint
 *                    violation on a live ingest, in exchange for saving a few
 *                    dozen bytes. One row per device per day is not a problem
 *                    worth taking that risk for.
 *   users, devices   Not test data in this sense; wiping a manager's device
 *                    registration would silently stop their alarms.
 */
export async function purgeExpiredTestData(
  db: Db,
  options: { retentionDays: number; now?: Date },
): Promise<RetentionResult> {
  const { retentionDays } = options;

  // 0 disables retention entirely. Treated as "keep everything", never as
  // "delete everything" - the destructive reading of a zero must not be the
  // one that happens by accident.
  if (retentionDays <= 0) {
    return { cutoff: null, alarms: 0, webhookEvents: 0 };
  }

  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  const alarms = await db.alarm.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const webhookEvents = await db.webhookEvent.deleteMany({
    where: { receivedAt: { lt: cutoff } },
  });

  return { cutoff, alarms: alarms.count, webhookEvents: webhookEvents.count };
}

/**
 * Runs the purge on a timer and reports each sweep that actually removed
 * something.
 *
 * Silence when nothing was deleted is deliberate: an hourly "deleted 0 rows"
 * line would train the operator to ignore this event, and it is the non-zero
 * ones that matter.
 */
export class RetentionSweeper {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly db: Db,
    private readonly options: { retentionDays: number; intervalMs: number },
  ) {}

  async sweepOnce(): Promise<RetentionResult> {
    // Overlapping sweeps would issue competing deletes for the same rows.
    if (this.running) return { cutoff: null, alarms: 0, webhookEvents: 0 };
    this.running = true;

    try {
      const result = await purgeExpiredTestData(this.db, {
        retentionDays: this.options.retentionDays,
      });

      if (result.alarms > 0 || result.webhookEvents > 0) {
        serverEvents.emit({
          event: "test_data_purged",
          message: `已清除 ${this.options.retentionDays} 天前的測試資料：告警 ${result.alarms} 筆、來源事件 ${result.webhookEvents} 筆`,
          context: {
            retentionDays: this.options.retentionDays,
            cutoff: result.cutoff?.toISOString() ?? null,
            alarms: result.alarms,
            webhookEvents: result.webhookEvents,
          },
        });
      }

      return result;
    } catch (error) {
      /**
       * A failed sweep must not take the API down with it. It is reported and
       * retried on the next tick - but it IS reported, because a retention
       * policy that has quietly stopped running is a policy the console is
       * still telling the operator about.
       */
      serverEvents.emit({
        event: "test_data_purge_failed",
        message: `測試資料清除失敗：${error instanceof Error ? error.message : String(error)}`,
        context: { retentionDays: this.options.retentionDays },
      });
      return { cutoff: null, alarms: 0, webhookEvents: 0 };
    } finally {
      this.running = false;
    }
  }

  start(): void {
    if (this.timer || this.options.retentionDays <= 0) return;

    // Once at startup: a console left closed over a weekend should not display
    // three-day-old data until the first interval elapses.
    void this.sweepOnce();

    this.timer = setInterval(() => void this.sweepOnce(), this.options.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
