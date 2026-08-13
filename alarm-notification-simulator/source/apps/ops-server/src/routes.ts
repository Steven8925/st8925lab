import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config, corsOrigins } from "./config.js";
import { classifyOutcome, OpsEventLog, type OpsEventRecord } from "./event-log.js";
import { buildDedupKey, findScenario, SCENARIOS, type Scenario } from "./scenarios.js";
import { postWebhook, type SignatureMode } from "./webhook-client.js";

const triggerSchema = z.object({
  scenarioId: z.string().min(1),
  /** Internal user ids, used by the canonical format. */
  recipientUserIds: z.array(z.string().uuid()).default([]),
  /** Email addresses, used by the legacy format that identifies people by email. */
  recipientEmails: z.array(z.string().email()).default([]),
  format: z.enum(["standard", "legacy-ops-v1"]).default("standard"),
  signatureMode: z.enum(["valid", "invalid", "missing"]).default("valid"),
  /** Reuse a previous event id to simulate a webhook retry. */
  eventId: z.string().min(1).max(200).optional(),
  /** Drop the deduplication key to show what a flapping sensor does without it. */
  omitDedupKey: z.boolean().default(false),
});

const flapSchema = triggerSchema.extend({
  count: z.coerce.number().int().min(2).max(20).default(5),
  intervalMs: z.coerce.number().int().min(0).max(2_000).default(100),
});

type TriggerInput = z.infer<typeof triggerSchema>;

const SEVERITY_TO_LEVEL: Record<string, number> = { info: 1, warning: 2, critical: 3 };

/** Builds the payload in whichever format the target expects. */
function buildPayload(
  scenario: Scenario,
  input: TriggerInput,
  eventId: string,
  occurredAt: Date,
  dedupKey: string | null,
): unknown {
  if (input.format === "legacy-ops-v1") {
    return {
      id: eventId,
      system: "legacy-ops",
      level: SEVERITY_TO_LEVEL[scenario.severity] ?? 2,
      subject: scenario.title,
      text: scenario.body,
      ts: Math.floor(occurredAt.getTime() / 1000),
      notify: input.recipientEmails,
      meta: scenario.details,
    };
  }

  return {
    eventId,
    source: "operations-server",
    severity: scenario.severity,
    title: scenario.title,
    body: scenario.body,
    occurredAt: occurredAt.toISOString(),
    ...(dedupKey ? { dedupKey } : {}),
    recipientUserIds: input.recipientUserIds,
    details: scenario.details,
  };
}

async function raiseEvent(log: OpsEventLog, input: TriggerInput): Promise<OpsEventRecord> {
  const scenario = findScenario(input.scenarioId);
  if (!scenario) {
    throw Object.assign(new Error(`Unknown scenario: ${input.scenarioId}`), { statusCode: 400 });
  }

  const occurredAt = new Date();
  const eventId = input.eventId ?? `ops-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const dedupKey = input.omitDedupKey ? null : buildDedupKey(scenario, occurredAt);

  const dispatch = await postWebhook({
    payload: buildPayload(scenario, input, eventId, occurredAt, dedupKey),
    format: input.format,
    signatureMode: input.signatureMode as SignatureMode,
  });

  const classified = classifyOutcome(dispatch);

  return log.add({
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    severity: scenario.severity,
    title: scenario.title,
    eventId,
    dedupKey,
    format: input.format,
    signatureMode: input.signatureMode,
    outcome: classified.outcome,
    alarmId: classified.alarmId,
    reference: classified.reference,
    httpStatus: dispatch.status,
    note: classified.note,
    dispatch,
  });
}

export async function registerOpsRoutes(app: FastifyInstance, log: OpsEventLog) {
  app.get("/v1/scenarios", async () => ({
    data: {
      items: SCENARIOS.map((scenario) => ({
        id: scenario.id,
        label: scenario.label,
        severity: scenario.severity,
        title: scenario.title,
        body: scenario.body,
        deduplicated: scenario.dedupKeyTemplate !== null,
      })),
    },
    error: null,
  }));

  /** This server's own record of what it raised - see event-log.ts. */
  app.get("/v1/events", async (request) => {
    const query = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) });
    const { limit } = query.parse(request.query);
    return { data: { items: log.list(limit), stats: log.stats() }, error: null };
  });

  app.post("/v1/trigger", async (request, reply) => {
    const input = triggerSchema.parse(request.body);
    const record = await raiseEvent(log, input);
    reply.send({ data: record, error: null });
  });

  /**
   * A flapping sensor: the same condition reported repeatedly in quick
   * succession.
   *
   * With a deduplication key every repeat lands in the same 5-minute bucket and
   * collapses into one alarm. With omitDedupKey the operator sees what the
   * manager's phone would have done at 3am instead - which is the argument for
   * why the key exists.
   */
  app.post("/v1/flap", async (request, reply) => {
    const input = flapSchema.parse(request.body);
    const records: OpsEventRecord[] = [];

    for (let index = 0; index < input.count; index += 1) {
      records.push(await raiseEvent(log, input));
      if (input.intervalMs > 0 && index < input.count - 1) {
        await new Promise((resolve) => setTimeout(resolve, input.intervalMs));
      }
    }

    const created = records.filter((record) => record.outcome === "ACCEPTED").length;
    const suppressed = records.filter((record) => record.outcome === "DUPLICATE").length;

    reply.send({
      data: {
        sent: records.length,
        alarmsCreated: created,
        duplicatesSuppressed: suppressed,
        summary: input.omitDedupKey
          ? `送出 ${records.length} 次、建立 ${created} 則告警 — 沒有去重鍵時，感測器抖動會變成 ${created} 次手機通知。`
          : `送出 ${records.length} 次、建立 ${created} 則告警、攔截 ${suppressed} 次重複 — 去重鍵讓抖動只通知一次。`,
        records,
      },
      error: null,
    });
  });

  /**
   * Convenience proxy so the trigger console can list who exists without
   * needing its own connection to the notification database.
   */
  app.get("/v1/recipients", async (_request, reply) => {
    try {
      const response = await fetch(`${config.NOTIFICATION_API_BASE_URL}/v1/admin/users`);
      const body = (await response.json()) as { data?: { items?: unknown[] } };
      reply.send({ data: { items: body.data?.items ?? [] }, error: null });
    } catch (error) {
      reply.status(502).send({
        data: null,
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: `無法向通知服務取得使用者清單：${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });
    }
  });

  /** Live feed of this server's own event log, for the console's left pane. */
  app.get("/v1/stream", async (request, reply) => {
    /**
     * CORS is set explicitly: reply.raw.writeHead() takes over the socket and
     * bypasses @fastify/cors entirely, so without this the browser silently
     * refuses the stream. Invisible to inject()/fetch-based tests.
     */
    const origin = request.headers.origin;
    const allowed = typeof origin === "string" && corsOrigins.includes(origin);

    reply.raw.writeHead(200, {
      ...(allowed
        ? { "access-control-allow-origin": origin, vary: "Origin" }
        : {}),
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });

    for (const record of log.list(30).reverse()) {
      reply.raw.write(`data: ${JSON.stringify(record)}\n\n`);
    }

    const unsubscribe = log.subscribe((record) => {
      reply.raw.write(`data: ${JSON.stringify(record)}\n\n`);
    });

    const heartbeat = setInterval(() => reply.raw.write(": ping\n\n"), 15_000);
    heartbeat.unref?.();

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
