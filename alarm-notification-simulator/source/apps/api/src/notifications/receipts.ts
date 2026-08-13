import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import { logger, tokenFingerprint } from "../logger.js";
import { DEVICE_NOT_REGISTERED, type PushProvider } from "./provider.js";
import { advanceRecipientState } from "./recipient-state.js";

export type ReceiptRunSummary = {
  checked: number;
  delivered: number;
  deviceConfirmed: number;
  suppressed: number;
  invalidToken: number;
  failed: number;
  stillPending: number;
};

export type ReceiptProcessorOptions = {
  /**
   * How long to wait after sending before asking for a receipt. Expo's own
   * guidance is to leave a gap rather than polling immediately; the simulator
   * uses a short delay so a demo does not stall.
   */
  minAgeMs?: number;
  batchSize?: number;
};

/**
 * Turns provider tickets into settled delivery outcomes.
 *
 * This is the component that stops the system from quietly decaying: without
 * receipt processing, tokens for uninstalled apps are never cleaned up and the
 * proportion of pushes going nowhere climbs month after month with no signal
 * (README.md §11 trap 1).
 */
export class ReceiptProcessor {
  private readonly minAgeMs: number;
  private readonly batchSize: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly db: Db,
    private readonly provider: PushProvider,
    options: ReceiptProcessorOptions = {},
  ) {
    this.minAgeMs = options.minAgeMs ?? 1_000;
    this.batchSize = options.batchSize ?? 200;
  }

  async processOnce(): Promise<ReceiptRunSummary> {
    const summary: ReceiptRunSummary = {
      checked: 0,
      delivered: 0,
      deviceConfirmed: 0,
      suppressed: 0,
      invalidToken: 0,
      failed: 0,
      stillPending: 0,
    };

    const cutoff = new Date(Date.now() - this.minAgeMs);

    const pending = await this.db.pushDelivery.findMany({
      where: {
        status: "ACCEPTED",
        ticketId: { not: null },
        sentAt: { lte: cutoff },
      },
      include: { device: true },
      orderBy: { sentAt: "asc" },
      take: this.batchSize,
    });

    if (pending.length === 0) return summary;

    const ticketIds = pending
      .map((delivery) => delivery.ticketId)
      .filter((ticketId): ticketId is string => ticketId !== null);

    const receipts = await this.provider.getReceipts(ticketIds);

    for (const delivery of pending) {
      if (!delivery.ticketId) continue;
      summary.checked += 1;

      const receipt = receipts.get(delivery.ticketId);

      if (!receipt) {
        // Not an error. The provider has not settled it yet; we will ask again.
        summary.stillPending += 1;
        continue;
      }

      if (receipt.status === "error") {
        if (receipt.code === DEVICE_NOT_REGISTERED) {
          await this.handleDeadToken(delivery.id, delivery.deviceId, delivery.device.pushToken, receipt.message);
          summary.invalidToken += 1;
        } else {
          await this.db.pushDelivery.update({
            where: { id: delivery.id },
            data: {
              status: "FAILED",
              errorCode: receipt.code,
              errorMessage: receipt.message,
              settledAt: new Date(),
            },
          });
          serverEvents.emit({
            event: "push_receipt_failed",
            alarmId: delivery.alarmId,
            deviceId: delivery.deviceId,
            message: `送達回條回報失敗：${receipt.code}`,
            context: { errorCode: receipt.code },
          });
          summary.failed += 1;
        }
        continue;
      }

      const settledAt = new Date();
      const status = receipt.suppressedReason
        ? "SUPPRESSED"
        : receipt.deviceConfirmed
          ? "DEVICE_CONFIRMED"
          : "DELIVERED";

      await this.db.pushDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          settledAt,
          deviceConfirmedAt: receipt.deviceConfirmed ? settledAt : null,
          errorCode: receipt.suppressedReason ?? null,
          errorMessage: receipt.suppressedReason
            ? "Delivered to the device but the OS did not display it"
            : null,
        },
      });

      if (receipt.suppressedReason) {
        summary.suppressed += 1;
        serverEvents.emit({
          event: "push_receipt_suppressed",
          alarmId: delivery.alarmId,
          deviceId: delivery.deviceId,
          // The sharpest case in the whole system: provably arrived, provably
          // unseen. A delivery report alone would have called this a success.
          message: `已送達裝置但系統未顯示（${receipt.suppressedReason}）— 使用者不會看到`,
          context: { reason: receipt.suppressedReason },
        });
      } else {
        summary.delivered += 1;
      }

      /**
       * A suppressed push must NOT advance the person.
       *
       * The device genuinely received it, so the DEVICE row is SUPPRESSED - but
       * the human saw nothing, and the recipient ledger tracks the human.
       * Advancing them to DELIVERED here would put a reassuring state next to
       * the manager's name in precisely the case this system exists to expose:
       * provably arrived, provably unseen. The person stays PENDING, and the
       * device row carries the explanation.
       *
       * These two conditions are deliberately mutually exclusive; the simulator
       * reports deviceConfirmed AND suppressedReason together, because both are
       * true of the device.
       */
      if (receipt.deviceConfirmed && !receipt.suppressedReason) {
        summary.deviceConfirmed += 1;
        /**
         * Only a handset confirmation advances the recipient to DELIVERED. A
         * provider receipt alone does not, because it only proves the message
         * reached the transport.
         *
         * PHASE B WARNING: FCM/APNs never set deviceConfirmed, so after the
         * transport swap this transition must be driven by the mobile app
         * calling the acknowledgement endpoint instead.
         */
        await advanceRecipientState(this.db, delivery.alarmId, await this.userIdForDevice(delivery.deviceId), {
          state: "DELIVERED",
          deliveredAt: settledAt,
        });

        serverEvents.emit({
          event: "push_receipt_delivered",
          alarmId: delivery.alarmId,
          deviceId: delivery.deviceId,
          message: "裝置已確認收到推播",
          context: { deviceConfirmed: true },
        });
      }
    }

    return summary;
  }

  private async userIdForDevice(deviceId: string): Promise<string> {
    const device = await this.db.device.findUniqueOrThrow({
      where: { id: deviceId },
      select: { userId: true },
    });
    return device.userId;
  }

  private async handleDeadToken(
    deliveryId: string,
    deviceId: string,
    pushToken: string,
    message: string,
  ): Promise<void> {
    await this.db.pushDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "INVALID_TOKEN",
        errorCode: DEVICE_NOT_REGISTERED,
        errorMessage: message,
        settledAt: new Date(),
      },
    });

    /**
     * Deactivated rather than deleted: the row is evidence for "why did this
     * manager stop receiving alarms in March". Re-registering from the app
     * reactivates it, so a reinstall self-heals.
     */
    await this.db.device.update({ where: { id: deviceId }, data: { active: false } });

    serverEvents.emit({
      event: "push_receipt_invalid_token",
      deviceId,
      message: `Token 失效，裝置已停用：${tokenFingerprint(pushToken)}`,
      context: { errorCode: DEVICE_NOT_REGISTERED },
    });
  }

  start(intervalMs = 2_000): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = true;

      void this.processOnce()
        .catch((error: unknown) => {
          logger.error({ err: error }, "receipt_processor_failed");
        })
        .finally(() => {
          this.running = false;
        });
    }, intervalMs);

    // Do not hold the event loop open purely for receipt polling.
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
