import type { FastifyInstance } from "fastify";
import {
  isSimulatorPushToken,
  SIMULATOR_WS_PATH,
  type SimulatorClientMessage,
  type SimulatorServerMessage,
} from "@alarm/contracts";
import { z } from "zod";
import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import { logger, tokenFingerprint } from "../logger.js";
import type { SimulatorDeviceHub } from "../notifications/simulator/hub.js";

const querySchema = z.object({
  token: z.string().min(1),
});

const clientMessageSchema = z.union([
  z.object({ type: z.literal("ack"), ticketId: z.string().min(1) }),
  z.object({
    type: z.literal("suppressed"),
    ticketId: z.string().min(1),
    reason: z.literal("PERMISSION_DENIED"),
  }),
  z.object({
    type: z.literal("state"),
    state: z.enum(["LOCKED", "FOREGROUND", "BACKGROUND", "TERMINATED"]),
  }),
]);

export type DeviceSocketDeps = {
  db: Db;
  hub: SimulatorDeviceHub;
};

/**
 * The simulated handset's connection to the server.
 *
 * PHASE B NOTE: this entire endpoint disappears when the transport becomes
 * FCM/APNs. Nothing in the alarm pipeline imports it - the only coupling is
 * through SimulatorPushProvider, which is one implementation of PushProvider.
 */
export async function registerDeviceSocket(app: FastifyInstance, deps: DeviceSocketDeps) {
  app.get(SIMULATOR_WS_PATH, { websocket: true }, async (socket, request) => {
    const send = (message: SimulatorServerMessage) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    };

    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      send({ type: "error", code: "BAD_REQUEST", message: "A token query parameter is required" });
      socket.close();
      return;
    }

    const token = parsedQuery.data.token;

    if (!isSimulatorPushToken(token)) {
      send({ type: "error", code: "BAD_TOKEN", message: "Not a simulator push token" });
      socket.close();
      return;
    }

    /**
     * The device must already be registered through the authenticated API. This
     * connection carries no credentials of its own, exactly like a real push
     * channel - which is why the payload it receives contains an alarm ID only
     * and every detail is fetched over the authenticated API instead.
     */
    const device = await deps.db.device.findUnique({ where: { pushToken: token } });

    if (!device) {
      send({
        type: "error",
        code: "UNKNOWN_DEVICE",
        message: "Register this device through POST /v1/devices/register first",
      });
      socket.close();
      return;
    }

    const disconnect = deps.hub.connect(token, device.id, send);

    await deps.db.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), active: true },
    });

    serverEvents.emit({
      event: "device_connected",
      deviceId: device.id,
      userId: device.userId,
      message: `模擬手機已連線：${device.label ?? device.platform}`,
      context: { pushTokenFp: tokenFingerprint(token) },
    });

    socket.on("message", (raw: Buffer) => {
      let parsed: SimulatorClientMessage;
      try {
        parsed = clientMessageSchema.parse(JSON.parse(raw.toString("utf8")));
      } catch {
        send({ type: "error", code: "BAD_MESSAGE", message: "Unrecognised client message" });
        return;
      }

      switch (parsed.type) {
        case "ack":
          // The handset confirming receipt. This is the signal that a real
          // FCM/APNs deployment cannot provide and must obtain from the app.
          deps.hub.confirmDelivery(parsed.ticketId);
          break;
        case "suppressed":
          deps.hub.markSuppressed(parsed.ticketId, parsed.reason);
          break;
        case "state":
          deps.hub.setAppState(token, parsed.state);
          break;
      }
    });

    socket.on("close", () => {
      disconnect();
      serverEvents.emit({
        event: "device_disconnected",
        deviceId: device.id,
        userId: device.userId,
        message: `模擬手機已離線：${device.label ?? device.platform}`,
      });
    });

    socket.on("error", (error: Error) => {
      logger.warn({ err: error, deviceId: device.id }, "device_socket_error");
      disconnect();
    });
  });
}
