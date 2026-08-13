import { config } from "../config.js";
import type { Db } from "../db/prisma.js";
import { AlarmPushDispatcher } from "./dispatch.js";
import type { PushProvider } from "./provider.js";
import { ReceiptProcessor } from "./receipts.js";
import { SimulatorDeviceHub } from "./simulator/hub.js";
import { SimulatorPushProvider } from "./simulator/provider.js";

export type NotificationStack = {
  provider: PushProvider;
  dispatcher: AlarmPushDispatcher;
  receipts: ReceiptProcessor;
  /** Only present for the simulator transport. */
  hub?: SimulatorDeviceHub;
};

/**
 * The single place that decides which transport is in use.
 *
 * Phase B adds one `case "expo"` here returning an ExpoPushProvider. Nothing
 * else in the codebase needs to change: the dispatcher, the recipient ledger,
 * the receipt processor and the dead-token cleanup all speak only to
 * PushProvider.
 */
export function createNotificationStack(db: Db): NotificationStack {
  switch (config.PUSH_PROVIDER) {
    case "simulator": {
      const hub = new SimulatorDeviceHub();
      const provider = new SimulatorPushProvider(hub);
      return {
        provider,
        hub,
        dispatcher: new AlarmPushDispatcher(db, provider),
        /**
         * The gap between a ticket and its receipt is configurable and
         * deliberately non-zero.
         *
         * Collapsing it would hide the distinction the whole delivery model
         * rests on: ACCEPTED (the provider took the request) and DELIVERED
         * (it actually arrived) are different facts arriving at different
         * times. A visible gap in the console makes that legible instead of
         * theoretical. A production Expo deployment uses minutes here.
         */
        receipts: new ReceiptProcessor(db, provider, {
          minAgeMs: config.SIMULATOR_RECEIPT_DELAY_MS,
        }),
      };
    }
    default:
      throw new Error(
        `PUSH_PROVIDER "${config.PUSH_PROVIDER}" has no implementation yet. ` +
          "Add a PushProvider implementation and register it here.",
      );
  }
}
