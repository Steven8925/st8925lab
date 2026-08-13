import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { corsOrigins } from "./config.js";
import {
  composeMessage,
  evaluateLevel,
  findSensor,
  SENSORS,
  type SensorLevel,
} from "./sensors.js";
import type { SourceEventStore } from "./source-store.js";

const setValueSchema = z.object({
  value: z.coerce.number(),
  /**
   * When true a row is written for EVERY reading above a threshold, not only
   * when the light changes. This is what a chattering sensor looks like, and it
   * is the case the notification service's deduplication exists to absorb.
   */
  writeEveryReading: z.boolean().default(false),
});

export async function registerSensorRoutes(app: FastifyInstance, store: SourceEventStore) {
  app.get("/v1/sensors", async () => ({
    data: {
      items: SENSORS.map((sensor) => ({
        id: sensor.id,
        label: sensor.label,
        deviceId: sensor.deviceId,
        metric: sensor.metric,
        unit: sensor.unit,
        min: sensor.min,
        max: sensor.max,
        yellow: sensor.yellow,
        red: sensor.red,
        value: sensor.value,
        level: sensor.level,
      })),
    },
    error: null,
  }));

  /**
   * Applies a new reading, exactly as the customer's system would: evaluate the
   * thresholds, decide the light, and write a row only when that decision
   * changes.
   *
   * Writing on level CHANGE rather than on every reading is what a real
   * threshold system does - otherwise a sensor sitting one degree above the
   * limit would produce a row per poll forever.
   */
  app.post("/v1/sensors/:sensorId/value", async (request, reply) => {
    const params = z.object({ sensorId: z.string().min(1) }).parse(request.params);
    const body = setValueSchema.parse(request.body);

    const sensor = findSensor(params.sensorId);
    if (!sensor) {
      throw Object.assign(new Error(`Unknown sensor: ${params.sensorId}`), { statusCode: 404 });
    }

    const clamped = Math.min(Math.max(body.value, sensor.min), sensor.max);
    const previousLevel: SensorLevel = sensor.level;
    const nextLevel = evaluateLevel(sensor, clamped);

    sensor.value = clamped;
    sensor.level = nextLevel;

    const crossedIntoAlarm = nextLevel !== "NORMAL" && nextLevel !== previousLevel;
    const shouldWrite = nextLevel !== "NORMAL" && (crossedIntoAlarm || body.writeEveryReading);

    const row = shouldWrite
      ? store.insert({
          deviceId: sensor.deviceId,
          metric: sensor.metric,
          metricLabel: sensor.label.split(" ")[0] ?? sensor.metric,
          value: clamped,
          unit: sensor.unit,
          level: nextLevel,
          threshold: nextLevel === "RED" ? sensor.red : sensor.yellow,
          message: composeMessage(sensor, clamped, nextLevel),
        })
      : null;

    reply.send({
      data: {
        sensorId: sensor.id,
        value: clamped,
        previousLevel,
        level: nextLevel,
        /** Null when the reading changed nothing the customer would report. */
        row,
        note: row
          ? `已寫入客戶資料庫 id=${row.id}，flag=1 等待通知程式取件`
          : nextLevel === "NORMAL"
            ? "回到正常範圍，未寫入告警（本版不發送恢復通知）"
            : "燈號未變化，未重複寫入",
      },
      error: null,
    });
  });

  /** The console's view of the customer's table. */
  app.get("/v1/source-events", async (request) => {
    const query = z.object({ limit: z.coerce.number().int().min(1).max(500).default(60) });
    const { limit } = query.parse(request.query);
    return { data: { items: store.list(limit), stats: store.stats() }, error: null };
  });

  /**
   * The notification service's pickup call.
   *
   * PRODUCTION NOTE: the real equivalent is a cursor-based SELECT against the
   * customer's database. This endpoint exists because in the simulation the
   * operations server plays the role of the customer's system marking its own
   * rows - our service must never write to a schema it does not own.
   */
  app.post("/v1/source-events/claim", async (_request, reply) => {
    const claimed = store.claimPending();
    reply.send({ data: { items: claimed, claimed: claimed.length }, error: null });
  });

  /** Live feed of rows appearing in the customer's table. */
  app.get("/v1/source-events/stream", async (request, reply) => {
    const origin = request.headers.origin;
    const allowed = typeof origin === "string" && corsOrigins.includes(origin);

    // See routes.ts: writeHead bypasses @fastify/cors, so CORS is explicit.
    reply.raw.writeHead(200, {
      ...(allowed ? { "access-control-allow-origin": origin, vary: "Origin" } : {}),
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });

    const unsubscribe = store.subscribe((row) => {
      reply.raw.write(`data: ${JSON.stringify(row)}\n\n`);
    });

    const heartbeat = setInterval(() => reply.raw.write(": ping\n\n"), 15_000);
    heartbeat.unref?.();

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
