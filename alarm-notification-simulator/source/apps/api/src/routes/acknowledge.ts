import type { FastifyInstance } from "fastify";
import { formatAlarmLabel, type AlarmRecipientState } from "@alarm/contracts";
import { z } from "zod";
import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import { AppError, ok } from "../lib/errors.js";
import { advanceRecipientState } from "../notifications/recipient-state.js";
import { requireUser } from "../plugins/auth.js";

const alarmIdParamsSchema = z.object({
  alarmId: z.string().uuid("alarmId must be a UUID"),
});

type AckKind = "ack" | "resolve";

async function applyAcknowledgement(
  db: Db,
  alarmId: string,
  userId: string,
  kind: AckKind,
  requestId: string,
  userEmail: string,
) {
  const recipient = await db.alarmRecipient.findUnique({
    where: { alarmId_userId: { alarmId, userId } },
    // The alarm's own name, so the audit line reads as a sentence about a
    // specific alarm rather than about an opaque id.
    include: { alarm: { select: { title: true, reference: true } } },
  });

  // Same 404 as an alarm that does not exist - never confirm that someone
  // else's alarm is real.
  if (!recipient) {
    throw AppError.notFound("Alarm not found");
  }

  const now = new Date();
  const advanced =
    kind === "ack"
      ? await advanceRecipientState(db, alarmId, userId, {
          state: "ACKED",
          ackedAt: now,
          deliveredAt: recipient.deliveredAt ?? now,
        })
      : await advanceRecipientState(db, alarmId, userId, {
          state: "RESOLVED",
          resolvedAt: now,
          // Resolving without a prior acknowledgement still implies both: the
          // user cannot have resolved something they never saw.
          ackedAt: recipient.ackedAt ?? now,
          deliveredAt: recipient.deliveredAt ?? now,
        });

  const updated = await db.alarmRecipient.findUniqueOrThrow({
    where: { alarmId_userId: { alarmId, userId } },
  });

  if (advanced) {
    const label = formatAlarmLabel(recipient.alarm.title, recipient.alarm.reference);

    serverEvents.emit({
      event: kind === "ack" ? "alarm_acknowledged" : "alarm_resolved",
      requestId,
      alarmId,
      userId,
      message:
        kind === "ack"
          ? `${userEmail} 已確認收到告警「${label}」`
          : `${userEmail} 已將告警「${label}」標記為處理完成`,
      context: { reference: recipient.alarm.reference },
    });
  }

  return {
    alarmId,
    state: updated.state as AlarmRecipientState,
    deliveredAt: updated.deliveredAt?.toISOString() ?? null,
    ackedAt: updated.ackedAt?.toISOString() ?? null,
    resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    /** False when the call was a no-op because this state was already reached. */
    changed: advanced,
  };
}

export async function registerAcknowledgementRoutes(app: FastifyInstance, db: Db) {
  /**
   * "I have seen this."
   *
   * Deliberately distinct from marking an alarm read: opening a detail screen
   * is passive evidence, pressing acknowledge is a deliberate act. Both are
   * kept because "opened but never acknowledged" is a real and useful state.
   */
  app.post("/v1/alarms/:alarmId/ack", {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const user = requireUser(request);
      const params = alarmIdParamsSchema.parse(request.params);

      const result = await applyAcknowledgement(
        db,
        params.alarmId,
        user.id,
        "ack",
        request.id,
        user.email,
      );
      reply.send(ok(result));
    },
  });

  /**
   * "This has been dealt with."
   *
   * Separate from acknowledge because a half-asleep tap at 3am proves someone
   * saw the alarm, not that the server room was fixed.
   */
  app.post("/v1/alarms/:alarmId/resolve", {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const user = requireUser(request);
      const params = alarmIdParamsSchema.parse(request.params);

      const result = await applyAcknowledgement(
        db,
        params.alarmId,
        user.id,
        "resolve",
        request.id,
        user.email,
      );
      reply.send(ok(result));
    },
  });
}
