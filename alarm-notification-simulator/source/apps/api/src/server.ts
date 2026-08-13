import crypto from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import type { FastifyBaseLogger } from "fastify";
import { ZodError } from "zod";
import { config, corsOrigins } from "./config.js";
import type { Db } from "./db/prisma.js";
import { prisma } from "./db/prisma.js";
import { AppError, fail, ok } from "./lib/errors.js";
import { logger } from "./logger.js";
import type { PushDispatcher } from "./notifications/dispatcher.js";
import type { SimulatorDeviceHub } from "./notifications/simulator/hub.js";
import authPlugin from "./plugins/auth.js";
import { registerAcknowledgementRoutes } from "./routes/acknowledge.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAlarmRoutes } from "./routes/alarms.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerDeviceRoutes } from "./routes/devices.js";
import { registerInternalRoutes } from "./routes/internal.js";
import { registerDeviceSocket } from "./ws/device.js";

declare module "fastify" {
  interface FastifyRequest {
    /**
     * Exact bytes as received. The webhook HMAC must be computed over these -
     * re-serialising the parsed JSON changes key order and whitespace and the
     * signature will never match (README.md §11 trap 13).
     */
    rawBody?: Buffer;
  }
}

export type ServerDeps = {
  db: Db;
  /** Supplied once a push provider is wired in (see src/notifications). */
  pushDispatcher?: PushDispatcher;
  /**
   * Present only while the simulator transport is active. Phase B drops this
   * along with the WebSocket endpoint.
   */
  simulatorHub?: SimulatorDeviceHub;
};

export async function buildServer(deps: ServerDeps = { db: prisma }) {
  const app = Fastify({
    // Widened to FastifyBaseLogger deliberately. Passing the concrete pino
    // Logger type specialises Fastify's logger generic, and every route
    // registrar typed against plain FastifyInstance then fails to match.
    loggerInstance: logger as FastifyBaseLogger,
    genReqId: () => crypto.randomUUID(),
    bodyLimit: 256 * 1024,
    trustProxy: true,
  });

  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
    const buffer = body as Buffer;
    request.rawBody = buffer;
    if (buffer.length === 0) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(buffer.toString("utf8")));
    } catch {
      done(AppError.badRequest("Request body is not valid JSON"), undefined);
    }
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });
  // Opt-in per route rather than a blanket limit: the alarm list is polled on
  // every app foreground, while login and the webhook need tight ceilings.
  await app.register(rateLimit, { global: false });
  await app.register(websocket);

  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof AppError) {
      if (error.statusCode >= 500) request.log.error({ err: error }, error.message);
      reply.status(error.statusCode).send(fail(error.code, error.message, requestId));
      return;
    }

    if (error instanceof ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      reply.status(400).send(fail("VALIDATION_ERROR", message, requestId));
      return;
    }

    // Fastify's own errors (body limit exceeded, unsupported media type, ...)
    // carry a statusCode. Anything client-side is surfaced; the rest is a 500.
    const fastifyError = error as { statusCode?: number; message?: string };
    if (typeof fastifyError.statusCode === "number" && fastifyError.statusCode < 500) {
      reply
        .status(fastifyError.statusCode)
        .send(fail("VALIDATION_ERROR", fastifyError.message ?? "Bad request", requestId));
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    reply
      .status(500)
      .send(fail("INTERNAL_ERROR", "An unexpected error occurred", requestId));
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(fail("NOT_FOUND", "Route not found", request.id));
  });

  app.get("/health", async (_request, reply) => {
    let database: "up" | "down" = "up";
    try {
      await deps.db.$queryRaw`SELECT 1`;
    } catch (error) {
      database = "down";
      app.log.error({ err: error }, "Health check database probe failed");
    }

    const body = {
      status: database === "up" ? ("ok" as const) : ("degraded" as const),
      database,
      pushProvider: config.PUSH_PROVIDER,
      environment: config.NODE_ENV,
      time: new Date().toISOString(),
    };

    reply.status(database === "up" ? 200 : 503).send(ok(body));
  });

  await app.register(authPlugin, { db: deps.db });

  await registerAuthRoutes(app, deps.db);
  await registerDeviceRoutes(app, deps.db);
  await registerAlarmRoutes(app, deps.db);
  await registerAcknowledgementRoutes(app, deps.db);
  await registerInternalRoutes(app, {
    db: deps.db,
    pushDispatcher: deps.pushDispatcher,
  });
  await registerAdminRoutes(app, { db: deps.db, simulatorHub: deps.simulatorHub });

  if (deps.simulatorHub) {
    await registerDeviceSocket(app, { db: deps.db, hub: deps.simulatorHub });
  }

  return app;
}

export type AppServer = Awaited<ReturnType<typeof buildServer>>;
