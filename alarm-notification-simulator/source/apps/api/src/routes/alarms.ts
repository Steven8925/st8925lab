import type { FastifyInstance } from "fastify";
import { alarmListQuerySchema, formatAlarmLabel } from "@alarm/contracts";
import { z } from "zod";
import {
  countUnreadForUser,
  getAlarmForUser,
  listAlarmsForUser,
  markAlarmRead,
} from "../alarms/repository.js";
import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import { AppError, ok } from "../lib/errors.js";
import { requireUser } from "../plugins/auth.js";

const alarmIdParamsSchema = z.object({
  alarmId: z.string().uuid("alarmId must be a UUID"),
});

export async function registerAlarmRoutes(app: FastifyInstance, db: Db) {
  // Registered before /v1/alarms/:alarmId so the literal path wins the match.
  app.get("/v1/alarms/unread-count", {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const user = requireUser(request);
      const unreadCount = await countUnreadForUser(db, user.id);
      reply.send(ok({ unreadCount }));
    },
  });

  app.get("/v1/alarms", {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const user = requireUser(request);
      const query = alarmListQuerySchema.parse(request.query);
      const result = await listAlarmsForUser(db, user.id, query);
      reply.send(ok(result));
    },
  });

  app.get("/v1/alarms/:alarmId", {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const user = requireUser(request);
      const params = alarmIdParamsSchema.parse(request.params);

      const alarm = await getAlarmForUser(db, user.id, params.alarmId);
      if (!alarm) {
        // Same response for "does not exist" and "belongs to someone else".
        throw AppError.notFound("Alarm not found");
      }

      reply.send(ok(alarm));
    },
  });

  app.post("/v1/alarms/:alarmId/read", {
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const user = requireUser(request);
      const params = alarmIdParamsSchema.parse(request.params);

      const result = await markAlarmRead(db, user.id, params.alarmId);

      if (!result.alreadyRead) {
        serverEvents.emit({
          event: "alarm_read",
          requestId: request.id,
          userId: user.id,
          alarmId: params.alarmId,
          // Named, not just identified: an operator reading this line should not
          // have to cross-reference a UUID to know which alarm was opened.
          message: `${user.email} 已開啟告警「${formatAlarmLabel(result.title, result.reference)}」`,
          context: { reference: result.reference },
        });
      }

      reply.send(ok({ alarmId: result.alarmId, readAt: result.readAt }));
    },
  });
}
