import type { FastifyInstance } from "fastify";
import { INTERNAL_WEBHOOK_SIGNATURE_HEADER } from "@alarm/contracts";
import { ZodError } from "zod";
import { ingestAlarmEvent } from "../alarms/ingest.js";
import { config } from "../config.js";
import type { Db } from "../db/prisma.js";
import { serverEvents } from "../events/bus.js";
import { AppError, ok } from "../lib/errors.js";
import type { PushDispatcher } from "../notifications/dispatcher.js";
import { listAdapters, resolveAdapter, SOURCE_FORMAT_HEADER } from "../webhooks/adapters/index.js";
import { hashPayload, verifyWebhookSignature } from "../webhooks/signature.js";

export type InternalRouteDeps = {
  db: Db;
  pushDispatcher?: PushDispatcher;
};

export async function registerInternalRoutes(app: FastifyInstance, deps: InternalRouteDeps) {
  const { db, pushDispatcher } = deps;

  /** Lets an integrator discover which source formats this server accepts. */
  app.get("/v1/internal/source-formats", async (_request, reply) => {
    reply.send(ok({ items: listAdapters(), default: "standard" }));
  });

  app.post("/v1/internal/alarms", {
    config: {
      rateLimit: { max: 300, timeWindow: "1 minute" },
    },
    handler: async (request, reply) => {
      const signature = request.headers[INTERNAL_WEBHOOK_SIGNATURE_HEADER];

      if (!verifyWebhookSignature(request.rawBody, signature, config.INTERNAL_WEBHOOK_SECRET)) {
        serverEvents.emit({
          event: "webhook_rejected",
          requestId: request.id,
          message: "Webhook 遭拒：HMAC 簽章驗證失敗",
          context: { reason: "invalid_signature", signaturePresent: signature !== undefined },
        });
        throw AppError.invalidSignature();
      }

      const adapter = resolveAdapter(request.headers[SOURCE_FORMAT_HEADER]);

      let normalised;
      try {
        normalised = adapter.normalise(request.body);
      } catch (error) {
        const message =
          error instanceof ZodError
            ? error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ")
            : error instanceof Error
              ? error.message
              : "Payload could not be normalised";

        serverEvents.emit({
          event: "webhook_rejected",
          requestId: request.id,
          message: `Webhook 遭拒：payload 不符合 ${adapter.name} 格式`,
          context: { reason: "schema", adapter: adapter.name, detail: message },
        });
        throw AppError.badRequest(message);
      }

      serverEvents.emit({
        event: "webhook_received",
        requestId: request.id,
        source: normalised.source,
        message: `收到 webhook：${normalised.title}`,
        context: {
          adapter: adapter.name,
          eventId: normalised.eventId,
          severity: normalised.severity,
        },
      });

      const result = await ingestAlarmEvent(db, {
        event: normalised,
        payloadHash: hashPayload(request.rawBody ?? Buffer.alloc(0)),
        requestId: request.id,
      });

      /**
       * Respond only after the transaction has committed, and always report who
       * could NOT be reached.
       *
       * A bare 200 would let the source system record "manager notified" when a
       * stale entry in its recipient list meant one of them was never addressed
       * at all. Partial delivery is acceptable precisely because it is reported.
       */
      reply.send(
        ok({
          alarmId: result.alarmId,
          /**
           * Returned so the CALLING system can log the same code its operators
           * will hear on the phone. Without it, the customer's own audit trail
           * holds a UUID and ours holds a code, and correlating an incident
           * afterwards means joining two logs by timestamp.
           */
          reference: result.reference,
          duplicate: result.duplicate,
          recipientCount: result.recipientUserIds.length,
          unresolvedRecipients: result.unresolved,
        }),
      );

      if (!result.duplicate && pushDispatcher) {
        // Not awaited: the source system's webhook call should not block on
        // push provider latency. Failures are recorded as PushDelivery rows.
        void pushDispatcher.sendForAlarm(result.alarmId, request.id).catch((error: unknown) => {
          request.log.error({ err: error, alarmId: result.alarmId }, "push_dispatch_failed");
        });
      }
    },
  });
}
