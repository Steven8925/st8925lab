import type { AlarmSeverity } from "@alarm/contracts";

export type PushMessage = {
  token: string;
  title: string;
  /** Includes the rendered timestamp line - see notifications/format.ts. */
  body: string;
  severity: AlarmSeverity;
  /** Matches the Expo/FCM vocabulary so the Phase B swap needs no translation. */
  priority: "default" | "high";
  /**
   * An identifier plus the two timestamps, and nothing else.
   *
   * Alarm CONTENT is still fetched over the authenticated API - nothing
   * sensitive passes through a third-party push service. The timestamps are the
   * exception on purpose: they are not sensitive, they are what the reader needs
   * before deciding whether to open anything, and keeping them machine-readable
   * lets the app re-render them in the reader's own locale.
   */
  data: { type: "alarm"; alarmId: string; occurredAt: string; sentAt: string };
  badge?: number;
};

export type PushTicket =
  | { status: "ok"; ticketId: string }
  | { status: "error"; code: string; message: string };

export type PushReceipt =
  | {
      status: "delivered";
      /**
       * True only when the handset itself confirmed receipt.
       *
       * The simulator's WebSocket transport can prove this. FCM and APNs cannot:
       * they offer no per-message delivery callback to your server. Any logic
       * that requires this to be true will silently stop working after the
       * Phase B transport swap.
       */
      deviceConfirmed: boolean;
      /**
       * The handset received it but the OS declined to display it - the user
       * never saw the notification despite a successful delivery.
       */
      suppressedReason?: string;
    }
  | { status: "error"; code: string; message: string };

/**
 * The transport seam.
 *
 * Everything above this interface - fan-out, the delivery ledger, receipt
 * processing, dead-token cleanup - is transport-agnostic. Swapping the
 * simulator for Expo, FCM or APNs means writing one new implementation of this
 * interface and changing one line of wiring.
 */
export interface PushProvider {
  readonly name: string;
  /** Providers refuse tokens they cannot deliver rather than failing silently. */
  supportsToken(token: string): boolean;
  /** Largest batch the provider accepts in one call (Expo caps this at 100). */
  readonly maxBatchSize: number;
  /** Tickets are returned positionally, one per message. */
  send(messages: PushMessage[]): Promise<PushTicket[]>;
  /** A missing key means the receipt is not available yet - not a failure. */
  getReceipts(ticketIds: string[]): Promise<Map<string, PushReceipt>>;
}

/** Provider-independent error code meaning "this token is dead, stop using it". */
export const DEVICE_NOT_REGISTERED = "DeviceNotRegistered";
