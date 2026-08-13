import type { FastifyInstance } from "fastify";
import { ADMIN_STREAM_PATH, type AlarmRecipientState } from "@alarm/contracts";
import { z } from "zod";
import { config } from "../config.js";
import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import { AppError, ok } from "../lib/errors.js";
import { sseHeaders } from "../lib/sse.js";
import { tokenFingerprint } from "../logger.js";
import type { SimulatorDeviceHub } from "../notifications/simulator/hub.js";

export type AdminRouteDeps = {
  db: Db;
  simulatorHub?: SimulatorDeviceHub;
};

const alarmIdParamsSchema = z.object({ alarmId: z.string().uuid() });
const uninstallSchema = z.object({ pushToken: z.string().min(1) });

/**
 * Read-only observability plus simulator controls, for the operations console.
 *
 * NOT AUTHENTICATED. This is acceptable only because the whole application is a
 * local feasibility simulation - the console is the operator's own screen. Any
 * deployment beyond localhost must put these behind an admin role before it is
 * reachable from a network; see PROMPT.md for the pre-production checklist.
 */
export async function registerAdminRoutes(app: FastifyInstance, deps: AdminRouteDeps) {
  const { db, simulatorHub } = deps;

  /** Server-sent events: the same records that go to the structured log. */
  app.get(ADMIN_STREAM_PATH, async (request, reply) => {
    // See lib/sse.ts: CORS must be written explicitly because taking over the
    // raw socket bypasses the plugin that would normally add it.
    reply.raw.writeHead(200, sseHeaders(request));

    const write = (payload: unknown) => {
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Replay recent history so a console opened mid-demo is not blank.
    for (const event of serverEvents.recent(80)) {
      write(event);
    }

    const unsubscribe = serverEvents.subscribe(write);
    const heartbeat = setInterval(() => reply.raw.write(": ping\n\n"), 15_000);
    heartbeat.unref?.();

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  /**
   * The per-recipient ledger for one alarm: who was meant to get it, how far
   * each person got, and which requested recipients had no account at all.
   */
  app.get("/v1/admin/alarms/:alarmId/ledger", async (request, reply) => {
    const params = alarmIdParamsSchema.parse(request.params);

    const alarm = await db.alarm.findUnique({
      where: { id: params.alarmId },
      include: {
        recipients: { include: { user: true } },
        unresolved: true,
        deliveries: { include: { device: true } },
        // Read state is a separate table from the recipient ledger: "opened it"
        // and "acknowledged it" are different acts and both need a timestamp.
        reads: true,
      },
    });

    if (!alarm) throw AppError.notFound("Alarm not found");

    reply.send(
      ok({
        alarmId: alarm.id,
        title: alarm.title,
        /** The quotable code. Null on alarms predating the numbering scheme. */
        reference: alarm.reference,
        severity: alarm.severity,
        source: alarm.source,
        occurredAt: alarm.occurredAt.toISOString(),
        /** When we stored it. The gap from occurredAt is the source system's lag. */
        createdAt: alarm.createdAt.toISOString(),
        recipients: alarm.recipients.map((recipient) => ({
          userId: recipient.userId,
          email: recipient.user.email,
          displayName: recipient.user.displayName,
          state: recipient.state as AlarmRecipientState,
          deliveredAt: recipient.deliveredAt?.toISOString() ?? null,
          /** When this person opened it - who read it, and when. */
          readAt:
            alarm.reads.find((read) => read.userId === recipient.userId)?.readAt.toISOString() ??
            null,
          ackedAt: recipient.ackedAt?.toISOString() ?? null,
          resolvedAt: recipient.resolvedAt?.toISOString() ?? null,
          undeliverableReason: recipient.undeliverableReason,
          devices: alarm.deliveries
            .filter((delivery) => delivery.device.userId === recipient.userId)
            .map((delivery) => ({
              deviceId: delivery.deviceId,
              label: delivery.device.label,
              platform: delivery.device.platform,
              // Never the full token, even on a local console.
              pushTokenFp: tokenFingerprint(delivery.device.pushToken),
              status: delivery.status,
              errorCode: delivery.errorCode,
              sentAt: delivery.sentAt?.toISOString() ?? null,
              settledAt: delivery.settledAt?.toISOString() ?? null,
              deviceConfirmedAt: delivery.deviceConfirmedAt?.toISOString() ?? null,
            })),
        })),
        /** Requested by the source system but not mapped to any account. */
        unresolvedRecipients: alarm.unresolved.map((entry) => ({
          identifier: entry.identifier,
          reason: entry.reason,
        })),
      }),
    );
  });

  /** Everything the console needs to render its device column. */
  app.get("/v1/admin/devices", async (_request, reply) => {
    const devices = await db.device.findMany({
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    reply.send(
      ok({
        items: devices.map((device) => ({
          id: device.id,
          userId: device.userId,
          email: device.user.email,
          label: device.label,
          platform: device.platform,
          pushToken: device.pushToken,
          active: device.active,
          connected: simulatorHub?.isConnected(device.pushToken) ?? false,
          uninstalled: simulatorHub?.isUninstalled(device.pushToken) ?? false,
          appState: simulatorHub?.getAppState(device.pushToken) ?? "TERMINATED",
          queuedPushes: simulatorHub?.queueDepth(device.pushToken) ?? 0,
        })),
      }),
    );
  });

  /**
   * Non-secret policy values the console displays.
   *
   * The retention figure is served from the SAME config the sweeper enforces
   * (`maintenance/retention.ts`). Hardcoding "3 days" in the UI would let the
   * displayed promise and the actual behaviour drift apart silently - and a
   * retention notice nobody enforces is worse than none, because the reader
   * assumes old data is already gone.
   */
  app.get("/v1/admin/policy", async (_request, reply) => {
    reply.send(
      ok({
        /** 0 means retention is disabled; the console then shows no claim. */
        testDataRetentionDays: config.TEST_DATA_RETENTION_DAYS,
        testDataRetentionSweepMs: config.TEST_DATA_RETENTION_SWEEP_MS,
        alarmReferenceTimezone: config.ALARM_REFERENCE_TIMEZONE,
      }),
    );
  });

  app.get("/v1/admin/users", async (_request, reply) => {
    const users = await db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, displayName: true, role: true, active: true },
    });
    reply.send(ok({ items: users }));
  });

  if (!simulatorHub) return;

  /**
   * Simulates uninstalling the app.
   *
   * The token is NOT deactivated here. It stays "valid" until the next push is
   * sent and its receipt comes back DeviceNotRegistered - which is exactly the
   * sequence a real deployment sees, and the only way to demonstrate that the
   * dead-token cleanup path actually works.
   */
  /**
   * The store-and-forward queue for one device.
   *
   * These are pushes the provider ACCEPTED for a handset that was not connected.
   * They are why "no acknowledgement yet" cannot be read as "lost": the message
   * is sitting here and will be delivered on reconnect. Distinct from the
   * recipient's unread count, which counts stored alarms awaiting attention.
   */
  app.get("/v1/admin/simulator/queue", async (request, reply) => {
    const query = z.object({ pushToken: z.string().min(1) }).parse(request.query);
    const device = await db.device.findUnique({
      where: { pushToken: query.pushToken },
      include: { user: true },
    });

    if (!device) throw AppError.notFound("Device not found");

    reply.send(
      ok({
        deviceId: device.id,
        label: device.label,
        email: device.user.email,
        connected: simulatorHub.isConnected(device.pushToken),
        depth: simulatorHub.queueDepth(device.pushToken),
        items: simulatorHub.peekQueue(device.pushToken),
      }),
    );
  });

  app.post("/v1/admin/simulator/uninstall", async (request, reply) => {
    const body = uninstallSchema.parse(request.body);
    const device = await db.device.findUnique({ where: { pushToken: body.pushToken } });

    if (!device) throw AppError.notFound("Device not found");

    simulatorHub.uninstall(body.pushToken);

    reply.send(
      ok({
        deviceId: device.id,
        uninstalled: true,
        note: "Token stays active until the next push receipt reports DeviceNotRegistered",
      }),
    );
  });
}
