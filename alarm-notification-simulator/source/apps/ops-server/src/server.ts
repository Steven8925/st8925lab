import crypto from "node:crypto";
import cors from "@fastify/cors";
import Fastify from "fastify";
import type { FastifyBaseLogger } from "fastify";
import { ZodError } from "zod";
import { config, corsOrigins } from "./config.js";
import { OpsEventLog } from "./event-log.js";
import { logger } from "./logger.js";
import { registerOpsRoutes } from "./routes.js";
import { registerSensorRoutes } from "./sensor-routes.js";
import { SourceEventStore } from "./source-store.js";

/**
 * Simulated customer operations server.
 *
 * Runs as a SEPARATE PROCESS on purpose. Calling the notification API in-process
 * would prove nothing: the HMAC signature, the header handling and the raw-body
 * verification all have to survive a real network hop, and that is the part of
 * the integration most likely to break at the customer site.
 *
 * Phase B deletes this application entirely and points the customer's real
 * server at the same endpoint.
 */
export async function buildOpsServer() {
  const app = Fastify({
    loggerInstance: logger as FastifyBaseLogger,
    genReqId: () => crypto.randomUUID(),
  });

  const eventLog = new OpsEventLog();
  /** Stands in for the customer's own alarm table. See source-store.ts. */
  const sourceEvents = new SourceEventStore();

  await app.register(cors, { origin: corsOrigins });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      reply.status(400).send({ data: null, error: { code: "VALIDATION_ERROR", message } });
      return;
    }

    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode >= 500) request.log.error({ err: error }, "Unhandled error");

    reply.status(statusCode).send({
      data: null,
      error: {
        code: statusCode < 500 ? "BAD_REQUEST" : "INTERNAL_ERROR",
        // Internal error text is never echoed back - it can leak paths and
        // connection strings.
        message:
          statusCode < 500 && error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
    });
  });

  app.get("/health", async () => ({
    data: {
      status: "ok" as const,
      role: "simulated-operations-server",
      notificationApi: config.NOTIFICATION_API_BASE_URL,
      eventsRaised: eventLog.stats().total,
      sourceEvents: sourceEvents.stats(),
      time: new Date().toISOString(),
    },
    error: null,
  }));

  await registerOpsRoutes(app, eventLog);
  await registerSensorRoutes(app, sourceEvents);

  return { app, eventLog, sourceEvents };
}

export type OpsServer = Awaited<ReturnType<typeof buildOpsServer>>;
