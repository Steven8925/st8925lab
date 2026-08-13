import type { FastifyInstance } from "fastify";
import type { Device } from "@alarm/contracts";
import { deviceRegisterRequestSchema, toPlatform } from "@alarm/contracts";
import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import { AppError, ok } from "../lib/errors.js";
import { tokenFingerprint } from "../logger.js";
import { isValidPushToken } from "../notifications/token.js";
import { requireUser } from "../plugins/auth.js";

export async function registerDeviceRoutes(app: FastifyInstance, db: Db) {
  app.post("/v1/devices/register", {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const user = requireUser(request);
      const body = deviceRegisterRequestSchema.parse(request.body);

      if (!isValidPushToken(body.pushToken)) {
        throw AppError.badRequest(
          "pushToken is not a recognised push token format",
        );
      }

      const platform = toPlatform(body.platform);
      const now = new Date();

      /**
       * Upsert keyed on the token, not on (user, token). A push token can move
       * between accounts when a device is handed over or an app is reinstalled;
       * re-pointing it at the authenticated user is exactly what prevents user A
       * from receiving user B's alarms (README.md §4.3).
       */
      const existing = await db.device.findUnique({
        where: { pushToken: body.pushToken },
        select: { id: true, userId: true },
      });

      const reassigned = existing != null && existing.userId !== user.id;

      const device = await db.device.upsert({
        where: { pushToken: body.pushToken },
        create: {
          userId: user.id,
          pushToken: body.pushToken,
          platform,
          label: body.label ?? null,
          appVersion: body.appVersion ?? null,
          osVersion: body.osVersion ?? null,
          locale: body.locale ?? null,
          timezone: body.timezone ?? null,
          active: true,
          lastSeenAt: now,
        },
        update: {
          userId: user.id,
          platform,
          label: body.label ?? null,
          appVersion: body.appVersion ?? null,
          osVersion: body.osVersion ?? null,
          locale: body.locale ?? null,
          timezone: body.timezone ?? null,
          // Re-registering revives a device that a DeviceNotRegistered receipt
          // had deactivated - a reinstall should start working again.
          active: true,
          lastSeenAt: now,
        },
      });

      serverEvents.emit({
        event: "device_registered",
        requestId: request.id,
        userId: user.id,
        deviceId: device.id,
        message: reassigned
          ? `裝置已改綁至 ${user.email}（token 先前屬於其他帳號）`
          : `裝置已註冊：${device.label ?? device.platform}`,
        context: {
          platform: device.platform,
          reassigned,
          // Key is deliberately not `pushToken`: that path is redacted by the
          // logger, which would blank the fingerprint too.
          pushTokenFp: tokenFingerprint(device.pushToken),
        },
      });

      const response: Device = {
        id: device.id,
        platform: device.platform as Device["platform"],
        label: device.label,
        active: device.active,
        lastSeenAt: device.lastSeenAt.toISOString(),
      };

      reply.send(ok(response));
    },
  });

  app.get("/v1/devices", {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const user = requireUser(request);
      const devices = await db.device.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      reply.send(
        ok({
          items: devices.map<Device>((device) => ({
            id: device.id,
            platform: device.platform as Device["platform"],
            label: device.label,
            active: device.active,
            lastSeenAt: device.lastSeenAt.toISOString(),
          })),
        }),
      );
    },
  });
}
