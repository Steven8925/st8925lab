import { formatAlarmLabel, type AlarmSeverity, type UndeliverableReason } from "@alarm/contracts";
import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import { tokenFingerprint } from "../logger.js";
import type { PushDispatcher } from "./dispatcher.js";
import { buildPushBody } from "./format.js";
import type { PushMessage, PushProvider } from "./provider.js";
import { advanceRecipientState } from "./recipient-state.js";

/** One message paired with the device it belongs to. */
type PendingSend = {
  deviceId: string;
  userId: string;
  token: string;
  message: PushMessage;
};

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export class AlarmPushDispatcher implements PushDispatcher {
  constructor(
    private readonly db: Db,
    private readonly provider: PushProvider,
  ) {}

  async sendForAlarm(alarmId: string, requestId: string): Promise<void> {
    const alarm = await this.db.alarm.findUnique({
      where: { id: alarmId },
      include: {
        recipients: {
          include: { user: { include: { devices: { where: { active: true } } } } },
        },
      },
    });

    if (!alarm) {
      throw new Error(`Alarm not found: ${alarmId}`);
    }

    serverEvents.emit({
      event: "push_send_started",
      requestId,
      alarmId,
      message: `開始推播：${alarm.recipients.length} 位收件人`,
      context: { provider: this.provider.name, recipientCount: alarm.recipients.length },
    });

    const pending: PendingSend[] = [];

    for (const recipient of alarm.recipients) {
      const devices = recipient.user.devices;

      if (devices.length === 0) {
        /**
         * A resolvable user with no registered device. This is exactly the case
         * a per-recipient ledger exists to make visible: the alarm is stored and
         * authorised, but nothing can reach this person right now.
         */
        await this.markUndeliverable(alarmId, recipient.userId, "NO_ACTIVE_DEVICE", requestId);
        continue;
      }

      for (const device of devices) {
        const existing = await this.db.pushDelivery.findUnique({
          where: { alarmId_deviceId: { alarmId, deviceId: device.id } },
        });

        // Never re-send to a device that already has a live attempt. The unique
        // index makes duplicates impossible; this skip makes retries cheap.
        if (existing && existing.status !== "PENDING" && existing.status !== "FAILED") {
          continue;
        }

        await this.db.pushDelivery.upsert({
          where: { alarmId_deviceId: { alarmId, deviceId: device.id } },
          create: { alarmId, deviceId: device.id, status: "PENDING" },
          update: { status: "PENDING", errorCode: null, errorMessage: null },
        });

        /**
         * Composed per device so the timestamp line can be rendered in that
         * handset's own timezone. A manager reading "15:04" needs to know
         * whether that is their 15:04.
         */
        const composedAt = new Date();

        pending.push({
          deviceId: device.id,
          userId: recipient.userId,
          token: device.pushToken,
          message: {
            token: device.pushToken,
            /**
             * The code is in the VISIBLE title, not only in the database.
             *
             * A lock-screen banner is often all a manager reads before phoning
             * someone. If the code lived only behind a login, the first thing
             * they would have to do is unlock a phone to find out which alarm
             * they are calling about.
             */
            title: `[${alarm.severity}] ${formatAlarmLabel(alarm.title, alarm.reference)}`,
            body: buildPushBody(alarm.body, {
              occurredAt: alarm.occurredAt,
              sentAt: composedAt,
              timeZone: device.timezone,
            }),
            severity: alarm.severity as AlarmSeverity,
            priority: alarm.severity === "CRITICAL" ? "high" : "default",
            // Identifier plus timestamps. Content still comes from the API.
            data: {
              type: "alarm",
              alarmId: alarm.id,
              occurredAt: alarm.occurredAt.toISOString(),
              sentAt: composedAt.toISOString(),
            },
          },
        });
      }
    }

    if (pending.length === 0) return;

    /**
     * Chunking pairs stay intact.
     *
     * The naive version keeps a flat deviceIds array and indexes it against the
     * tickets of each chunk - which silently attributes chunk 2's tickets to
     * chunk 1's devices (README.md §8.3). Chunking the PAIRS instead makes that
     * class of bug unrepresentable.
     */
    for (const group of chunk(pending, this.provider.maxBatchSize)) {
      const unsupported = group.filter((item) => !this.provider.supportsToken(item.token));
      const deliverable = group.filter((item) => this.provider.supportsToken(item.token));

      for (const item of unsupported) {
        /**
         * FAILED, not INVALID_TOKEN: the token may be perfectly valid for a
         * different provider. Deactivating the device here would destroy a good
         * registration merely because the active transport changed.
         */
        await this.recordFailure(
          alarmId,
          item.deviceId,
          "UnsupportedToken",
          `Token is not deliverable by the ${this.provider.name} provider`,
          requestId,
        );
      }

      if (deliverable.length === 0) continue;

      const sentAt = new Date();
      const tickets = await this.provider.send(deliverable.map((item) => item.message));

      for (let index = 0; index < deliverable.length; index += 1) {
        const item = deliverable[index];
        const ticket = tickets[index];
        if (!item) continue;

        if (!ticket) {
          await this.recordFailure(
            alarmId,
            item.deviceId,
            "NoTicket",
            "Provider returned fewer tickets than messages",
            requestId,
          );
          continue;
        }

        if (ticket.status === "ok") {
          await this.db.pushDelivery.update({
            where: { alarmId_deviceId: { alarmId, deviceId: item.deviceId } },
            data: { status: "ACCEPTED", ticketId: ticket.ticketId, sentAt },
          });

          serverEvents.emit({
            event: "push_ticket_accepted",
            requestId,
            alarmId,
            deviceId: item.deviceId,
            userId: item.userId,
            // ACCEPTED means the provider took the request. It is not delivery.
            message: `推播已被供應商接受（尚未送達）：${tokenFingerprint(item.token)}`,
            context: { ticketId: ticket.ticketId, provider: this.provider.name },
          });
        } else {
          await this.recordFailure(
            alarmId,
            item.deviceId,
            ticket.code,
            ticket.message,
            requestId,
            item.userId,
          );
        }
      }
    }

    await this.markRecipientsWithNoSuccessfulSend(alarmId, requestId);
  }

  private async recordFailure(
    alarmId: string,
    deviceId: string,
    code: string,
    message: string,
    requestId: string,
    userId?: string,
  ): Promise<void> {
    await this.db.pushDelivery.update({
      where: { alarmId_deviceId: { alarmId, deviceId } },
      data: { status: "FAILED", errorCode: code, errorMessage: message, settledAt: new Date() },
    });

    serverEvents.emit({
      event: "push_ticket_failed",
      requestId,
      alarmId,
      deviceId,
      userId,
      message: `推播被供應商拒絕：${code}`,
      context: { errorCode: code, errorMessage: message },
    });
  }

  private async markUndeliverable(
    alarmId: string,
    userId: string,
    reason: UndeliverableReason,
    requestId: string,
  ): Promise<void> {
    const updated = await advanceRecipientState(this.db, alarmId, userId, {
      state: "UNDELIVERABLE",
      undeliverableReason: reason,
    });

    if (!updated) return;

    serverEvents.emit({
      event: "recipient_undeliverable",
      requestId,
      alarmId,
      userId,
      message:
        reason === "NO_ACTIVE_DEVICE"
          ? "收件人沒有任何已註冊裝置，無法送達"
          : "收件人所有裝置都無法送達",
      context: { reason },
    });
  }

  /**
   * After sending, any recipient whose every device attempt failed is marked
   * undeliverable. Without this the alarm would sit at PENDING forever and look
   * merely "not yet acknowledged" rather than "never had a chance of arriving".
   */
  private async markRecipientsWithNoSuccessfulSend(
    alarmId: string,
    requestId: string,
  ): Promise<void> {
    const recipients = await this.db.alarmRecipient.findMany({
      where: { alarmId, state: "PENDING" },
      include: { user: { include: { devices: { where: { active: true } } } } },
    });

    for (const recipient of recipients) {
      const deviceIds = recipient.user.devices.map((device) => device.id);
      if (deviceIds.length === 0) continue;

      const deliveries = await this.db.pushDelivery.findMany({
        where: { alarmId, deviceId: { in: deviceIds } },
      });

      if (deliveries.length === 0) continue;

      const allFailed = deliveries.every(
        (delivery) => delivery.status === "FAILED" || delivery.status === "INVALID_TOKEN",
      );

      if (allFailed) {
        const reason: UndeliverableReason = deliveries.every(
          (delivery) => delivery.status === "INVALID_TOKEN",
        )
          ? "ALL_TOKENS_INVALID"
          : "ALL_SENDS_FAILED";
        await this.markUndeliverable(alarmId, recipient.userId, reason, requestId);
      }
    }
  }
}
