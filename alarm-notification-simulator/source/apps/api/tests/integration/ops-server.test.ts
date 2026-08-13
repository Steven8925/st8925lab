import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import WebSocket from "ws";
import {
  makeSimulatorPushToken,
  parseAlarmReference,
  SIMULATOR_WS_PATH,
  type SimulatorServerMessage,
} from "@alarm/contracts";
import { hashPassword } from "../../src/auth/password.js";
import type { Db } from "../../src/db/prisma.js";
import { AlarmPushDispatcher } from "../../src/notifications/dispatch.js";
import { ReceiptProcessor } from "../../src/notifications/receipts.js";
import { SimulatorDeviceHub } from "../../src/notifications/simulator/hub.js";
import { SimulatorPushProvider } from "../../src/notifications/simulator/provider.js";
import { buildServer } from "../../src/server.js";
import { createTestDatabase } from "../helpers/db.js";
import type { TestDatabase } from "../helpers/db.js";

/**
 * Cross-process integration: the simulated operations server signs a webhook
 * and POSTs it over real HTTP to the notification API, which fans it out to a
 * handset over a real WebSocket.
 *
 * The point is the network hop. An in-process call would not exercise raw-body
 * HMAC verification, header propagation, or the format-selection header - which
 * are precisely the things that break at a customer site.
 */
let database: TestDatabase;
let db: Db;
let hub: SimulatorDeviceHub;
let receipts: ReceiptProcessor;
let api: Awaited<ReturnType<typeof buildServer>>;
let apiPort: number;
let ops: { app: any; eventLog: any };
let opsPort: number;
const sockets: WebSocket[] = [];

beforeAll(async () => {
  database = await createTestDatabase();
  db = database.db;
  hub = new SimulatorDeviceHub();
  const provider = new SimulatorPushProvider(hub);
  receipts = new ReceiptProcessor(db, provider, { minAgeMs: 0 });

  api = await buildServer({
    db,
    pushDispatcher: new AlarmPushDispatcher(db, provider),
    simulatorHub: hub,
  });
  await api.listen({ port: 0, host: "127.0.0.1" });
  const apiAddress = api.server.address();
  if (typeof apiAddress === "string" || apiAddress === null) throw new Error("no api address");
  apiPort = apiAddress.port;

  // The ops server reads its target from the environment at import time, so it
  // is pointed at this run's ephemeral API port before being loaded.
  process.env.NOTIFICATION_API_BASE_URL = `http://127.0.0.1:${apiPort}`;
  const { buildOpsServer } = await import("../../../ops-server/src/server.js");

  ops = await buildOpsServer();
  await ops.app.listen({ port: 0, host: "127.0.0.1" });
  const opsAddress = ops.app.server.address();
  if (typeof opsAddress === "string" || opsAddress === null) throw new Error("no ops address");
  opsPort = opsAddress.port;
});

afterAll(async () => {
  for (const socket of sockets) socket.close();
  receipts.stop();
  await ops.app.close();
  await api.close();
  await database.destroy();
});

beforeEach(async () => {
  ops.eventLog.clear();
  /**
   * Alarms carry a deduplication key bucketed to five minutes, so an alarm left
   * over from a previous test in this file would silently suppress the next
   * one. Clearing between tests keeps each scenario's dedup behaviour its own.
   */
  await db.alarm.deleteMany();
  await db.webhookEvent.deleteMany();
});

async function callOps(path: string, init: RequestInit = {}) {
  const response = await fetch(`http://127.0.0.1:${opsPort}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  return { status: response.status, body: (await response.json()) as any };
}

async function callApi(path: string, init: RequestInit = {}) {
  const response = await fetch(`http://127.0.0.1:${apiPort}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  return { status: response.status, body: (await response.json()) as any };
}

async function createManagerWithPhone(email: string, label: string) {
  const user = await db.user.create({
    data: { email, passwordHash: await hashPassword("ops-test-pw"), displayName: label },
  });

  const login = await callApi("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "ops-test-pw" }),
  });
  const auth = { authorization: `Bearer ${login.body.data.accessToken}` };

  const pushToken = makeSimulatorPushToken(label);
  const registration = await callApi("/v1/devices/register", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ pushToken, platform: "simulator", label }),
  });

  /**
   * Asserted, not assumed. A failed registration here produces no device, which
   * makes every later "no push arrived" assertion pass for entirely the wrong
   * reason - the exact failure this helper hid once already.
   */
  if (registration.status !== 200) {
    throw new Error(
      `Device registration failed for ${label}: ${registration.status} ${JSON.stringify(registration.body)}`,
    );
  }

  const socket = new WebSocket(
    `ws://127.0.0.1:${apiPort}${SIMULATOR_WS_PATH}?token=${encodeURIComponent(pushToken)}`,
  );
  sockets.push(socket);

  const received: SimulatorServerMessage[] = [];
  socket.on("message", (raw: Buffer) => {
    const message = JSON.parse(raw.toString("utf8")) as SimulatorServerMessage;
    received.push(message);
    if (message.type === "push") {
      socket.send(JSON.stringify({ type: "ack", ticketId: message.envelope.ticketId }));
    }
  });

  await new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });

  return {
    user,
    auth,
    pushToken,
    pushes: () => received.filter((message) => message.type === "push"),
  };
}

/** Pushes are delivered asynchronously; wait for the count rather than sleeping. */
async function waitForPushCount(
  phone: { pushes: () => SimulatorServerMessage[] },
  expected: number,
  timeoutMs = 3_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (phone.pushes().length < expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return phone.pushes();
}

describe("operations server catalogue", () => {
  test("exposes its scenarios and flags which ones are deduplicated", async () => {
    const response = await callOps("/v1/scenarios");

    expect(response.status).toBe(200);
    const items = response.body.data.items as { id: string; deduplicated: boolean }[];
    expect(items.length).toBeGreaterThan(0);

    const fire = items.find((item) => item.id === "fire-suppression");
    const temperature = items.find((item) => item.id === "temperature-critical");

    // A second gas discharge is a new emergency, not a repeat of the first.
    expect(fire?.deduplicated).toBe(false);
    expect(temperature?.deduplicated).toBe(true);
  });
});

describe("raising an alarm across the network boundary", () => {
  test("a signed event reaches the manager's phone", async () => {
    const manager = await createManagerWithPhone("ops-e2e@test.local", "Ops E2E Phone");

    const triggered = await callOps("/v1/trigger", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "temperature-critical",
        recipientUserIds: [manager.user.id],
      }),
    });

    expect(triggered.status).toBe(200);
    expect(triggered.body.data.outcome).toBe("ACCEPTED");
    expect(triggered.body.data.httpStatus).toBe(200);

    const pushes = await waitForPushCount(manager, 1);
    expect(pushes).toHaveLength(1);

    const push = pushes[0];
    if (push?.type !== "push") throw new Error("expected a push");
    expect(push.envelope.data.alarmId).toBe(triggered.body.data.alarmId);
  });

  test("the operations server keeps its own record of what it sent", async () => {
    const manager = await createManagerWithPhone("ops-log@test.local", "Ops Log Phone");

    await callOps("/v1/trigger", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "disk-usage-high",
        recipientUserIds: [manager.user.id],
      }),
    });

    const events = await callOps("/v1/events");
    const record = events.body.data.items[0];

    expect(record.scenarioId).toBe("disk-usage-high");
    expect(record.outcome).toBe("ACCEPTED");
    expect(record.alarmId).toBeTruthy();

    // The operations team can answer "what exactly did we send" without any
    // access to the notification system's database.
    const sent = JSON.parse(record.dispatch.requestBody);
    expect(sent.eventId).toBe(record.eventId);
    expect(sent.severity).toBe("warning");
    expect(sent.details.volume).toBe("/var");
    expect(record.dispatch.signaturePreview).toMatch(/^[0-9a-f]{12}\.\.\.$/);
    // The signature is recorded truncated - the log must never carry material
    // an attacker could replay.
    expect(record.dispatch.signaturePreview.length).toBeLessThan(20);
  });
});

describe("the signature check is demonstrably enforced", () => {
  test("an incorrectly signed event is rejected and no push is sent", async () => {
    const manager = await createManagerWithPhone("ops-badsig@test.local", "Bad Sig Phone");

    const triggered = await callOps("/v1/trigger", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "ups-battery-fault",
        recipientUserIds: [manager.user.id],
        signatureMode: "invalid",
      }),
    });

    expect(triggered.body.data.outcome).toBe("REJECTED");
    expect(triggered.body.data.httpStatus).toBe(401);
    expect(triggered.body.data.alarmId).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(manager.pushes()).toHaveLength(0);
  });

  test("an unsigned event is rejected and no push is sent", async () => {
    const manager = await createManagerWithPhone("ops-nosig@test.local", "No Sig Phone");

    const triggered = await callOps("/v1/trigger", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "ups-battery-fault",
        recipientUserIds: [manager.user.id],
        signatureMode: "missing",
      }),
    });

    expect(triggered.body.data.outcome).toBe("REJECTED");
    expect(triggered.body.data.httpStatus).toBe(401);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(manager.pushes()).toHaveLength(0);
  });
});

describe("flapping sensor", () => {
  test("a deduplication key collapses a burst into a single notification", async () => {
    const manager = await createManagerWithPhone("ops-flap@test.local", "Flap Phone");

    const response = await callOps("/v1/flap", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "temperature-critical",
        recipientUserIds: [manager.user.id],
        count: 6,
        intervalMs: 0,
      }),
    });

    expect(response.body.data.sent).toBe(6);
    expect(response.body.data.alarmsCreated).toBe(1);
    expect(response.body.data.duplicatesSuppressed).toBe(5);

    await new Promise((resolve) => setTimeout(resolve, 300));
    // The whole argument for dedupKey: one phone buzz, not six.
    expect(manager.pushes()).toHaveLength(1);
  });

  test("without a deduplication key the same burst becomes one notification each", async () => {
    const manager = await createManagerWithPhone("ops-noflap@test.local", "No Dedup Phone");

    const response = await callOps("/v1/flap", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "temperature-critical",
        recipientUserIds: [manager.user.id],
        count: 6,
        intervalMs: 0,
        omitDedupKey: true,
      }),
    });

    expect(response.body.data.alarmsCreated).toBe(6);

    const pushes = await waitForPushCount(manager, 6);
    // This is what a manager's phone does at 3am without deduplication.
    expect(pushes).toHaveLength(6);
  });
});

describe("legacy source format", () => {
  test("a legacy event with email recipients is translated and delivered", async () => {
    const manager = await createManagerWithPhone("ops-legacy@test.local", "Legacy Phone");

    const triggered = await callOps("/v1/trigger", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "wan-link-flap",
        format: "legacy-ops-v1",
        recipientEmails: [manager.user.email],
      }),
    });

    expect(triggered.body.data.outcome).toBe("ACCEPTED");

    /**
     * The operations side records the SAME code the notification side issued.
     *
     * This is what lets one incident be traced across two independently owned
     * logs; without it the customer's audit trail holds a UUID, ours holds a
     * code, and correlating them afterwards means joining on timestamps.
     */
    /**
     * Checked with the real parser rather than a regex written here. A local
     * copy of the format drifts: this assertion was first written as
     * `/^[A-Z0-9]+-\d{8}-\d{2,}$/` and broke the moment the device-less fallback
     * key gained underscores, even though nothing was actually wrong.
     */
    expect(parseAlarmReference(triggered.body.data.reference)).not.toBeNull();
    expect(triggered.body.data.note).toContain(triggered.body.data.reference);
    /**
     * Spacing, which is invisible to a `toContain` on the code alone. A missing
     * separator produced `告警 OPERATIONSSERVER-20260813-01已建立` - readable
     * enough to survive review, wrong in every line the operator ever reads.
     */
    expect(triggered.body.data.note).toContain(`${triggered.body.data.reference} 已建立`);

    const pushes = await waitForPushCount(manager, 1);
    expect(pushes).toHaveLength(1);

    const alarm = await db.alarm.findUniqueOrThrow({
      where: { id: triggered.body.data.alarmId },
    });
    // Numeric level 2 became WARNING, and the email resolved to a user id.
    expect(alarm.severity).toBe("WARNING");
    expect(alarm.source).toBe("legacy-ops");
  });

  test("a legacy event naming an unknown mailbox is recorded, not silently dropped", async () => {
    const manager = await createManagerWithPhone("ops-legacy-partial@test.local", "Partial Phone");

    const triggered = await callOps("/v1/trigger", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "disk-usage-high",
        format: "legacy-ops-v1",
        recipientEmails: [manager.user.email, "someone-who-left@test.local"],
      }),
    });

    expect(triggered.body.data.outcome).toBe("PARTIAL");
    // The operator is told exactly who was missed, in their own event log.
    expect(triggered.body.data.note).toContain("someone-who-left@test.local");

    const pushes = await waitForPushCount(manager, 1);
    expect(pushes).toHaveLength(1);
  });
});
