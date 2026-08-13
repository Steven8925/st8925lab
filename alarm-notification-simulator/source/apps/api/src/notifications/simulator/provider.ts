import { isSimulatorPushToken } from "@alarm/contracts";
import {
  DEVICE_NOT_REGISTERED,
  type PushMessage,
  type PushProvider,
  type PushReceipt,
  type PushTicket,
} from "../provider.js";
import type { SimulatorDeviceHub } from "./hub.js";

/**
 * Phase A transport. Delivers over WebSocket to the browser phone simulator.
 *
 * The point of this class is that it is the ONLY file that knows the transport
 * is a WebSocket. Phase B replaces it with an ExpoPushProvider implementing the
 * same interface; the dispatcher, ledger, receipt processor and dead-token
 * cleanup are untouched.
 */
export class SimulatorPushProvider implements PushProvider {
  readonly name = "simulator";
  /**
   * Matches Expo's documented cap. Keeping the simulator's limit identical
   * means the chunking code is exercised under the same constraints it will
   * face in production, rather than being discovered to be wrong later.
   */
  readonly maxBatchSize = 100;

  constructor(private readonly hub: SimulatorDeviceHub) {}

  supportsToken(token: string): boolean {
    return isSimulatorPushToken(token);
  }

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    if (messages.length > this.maxBatchSize) {
      throw new Error(
        `Batch of ${messages.length} exceeds maxBatchSize ${this.maxBatchSize}. The caller must chunk.`,
      );
    }

    return messages.map((message): PushTicket => {
      if (!this.supportsToken(message.token)) {
        return {
          status: "error",
          code: "InvalidTokenFormat",
          message: `Token is not deliverable by the ${this.name} provider`,
        };
      }

      const ticketId = this.hub.enqueue(message.token, {
        alarmId: message.data.alarmId,
        title: message.title,
        body: message.body,
        data: message.data,
        occurredAt: message.data.occurredAt,
        // Taken from the message, not from a fresh clock read: this must be the
        // same instant the body text already states, or the two disagree.
        sentAt: message.data.sentAt,
        priority: message.priority,
      });

      return { status: "ok", ticketId };
    });
  }

  async getReceipts(ticketIds: string[]): Promise<Map<string, PushReceipt>> {
    const receipts = new Map<string, PushReceipt>();

    for (const ticketId of ticketIds) {
      const ticket = this.hub.getTicket(ticketId);
      if (!ticket) continue;

      /**
       * A token uninstalled after the send still yields DeviceNotRegistered
       * here. That ordering is the whole reason receipts exist separately from
       * tickets, and it is what drives dead-token cleanup.
       */
      if (this.hub.isUninstalled(ticket.token)) {
        receipts.set(ticketId, {
          status: "error",
          code: DEVICE_NOT_REGISTERED,
          message: "The application was uninstalled from this device",
        });
        continue;
      }

      if (ticket.suppressedReason) {
        receipts.set(ticketId, {
          status: "delivered",
          deviceConfirmed: true,
          suppressedReason: ticket.suppressedReason,
        });
        continue;
      }

      if (ticket.deviceConfirmedAt) {
        receipts.set(ticketId, { status: "delivered", deviceConfirmed: true });
        continue;
      }

      /**
       * Queued for a disconnected device. Reported as delivered-to-transport
       * with deviceConfirmed false - which is exactly the amount of certainty
       * a real FCM receipt gives you, and no more.
       */
      receipts.set(ticketId, { status: "delivered", deviceConfirmed: false });
    }

    return receipts;
  }
}
