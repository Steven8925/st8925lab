import { afterEach, beforeEach, describe, expect, test } from "vitest";
import WebSocket from "ws";
import {
  INTERNAL_WEBHOOK_SIGNATURE_HEADER,
  makeSimulatorPushToken,
  SIMULATOR_WS_PATH,
  type SimulatorServerMessage,
} from "@alarm/contracts";
import { hashPassword } from "../../src/auth/password.js";
import { config } from "../../src/config.js";
import type { Db } from "../../src/db/prisma.js";
import { AlarmPushDispatcher } from "../../src/notifications/dispatch.js";
import { ReceiptProcessor } from "../../src/notifications/receipts.js";
import { SimulatorDeviceHub } from "../../src/notifications/simulator/hub.js";
import { SimulatorPushProvider } from "../../src/notifications/simulator/provider.js";
import { buildServer } from "../../src/server.js";
import { computeWebhookSignature } from "../../src/webhooks/signature.js";
import { createTestDatabase } from "../helpers/db.js";
import type { TestDatabase } from "../helpers/db.js";

const PASSWORD = "e2e-password-123";

let database: TestDatabase;
let db: Db;
let hub: SimulatorDeviceHub;
let receipts: ReceiptProcessor;
let app: Awaited<ReturnType<typeof buildServer>>;
let baseUrl: string;
const sockets: WebSocket[] = [];

beforeEach(async () => {
  database = await createTestDatabase();
  db = database.db;
  hub = new SimulatorDeviceHub();
  const provider = new SimulatorPushProvider(hub);
  receipts = new ReceiptProcessor(db, provider, { minAgeMs: 0 });

  app = await buildServer({
    db,
    pushDispatcher: new AlarmPushDispatcher(db, provider),
    simulatorHub: hub,
  });

  // Port 0 asks the OS for a free port, so parallel runs cannot collide.
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  if (typeof address === "string" || address === null) {
    throw new Error("Expected a TCP address");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  for (const socket of sockets) socket.close();
  sockets.length = 0;
  receipts.stop();
  await app.close();
  await database.destroy();
});

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  return { status: response.status, body: (await response.json()) as any };
}

/** Connects a simulated handset and collects what it receives. */
function connectPhone(token: string, options: { autoAck?: boolean } = {}) {
  const address = app.server.address();
  if (typeof address === "string" || address === null) throw new Error("no address");

  const socket = new WebSocket(
    `ws://127.0.0.1:${address.port}${SIMULATOR_WS_PATH}?token=${encodeURIComponent(token)}`,
  );
  sockets.push(socket);

  const received: SimulatorServerMessage[] = [];

  socket.on("message", (raw: Buffer) => {
    const message = JSON.parse(raw.toString("utf8")) as SimulatorServerMessage;
    received.push(message);

    // The app acknowledging receipt. In Phase B this is the ONLY way the server
    // can learn the handset got it - FCM and APNs provide no equivalent.
    if (message.type === "push" && options.autoAck !== false) {
      socket.send(JSON.stringify({ type: "ack", ticketId: message.envelope.ticketId }));
    }
  });

  const opened = new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });

  return {
    socket,
    received,
    opened,
    pushes: () => received.filter((message) => message.type === "push"),
    waitForPush: (timeoutMs = 5_000) =>
      new Promise<SimulatorServerMessage>((resolve, reject) => {
        const existing = received.find((message) => message.type === "push");
        if (existing) {
          resolve(existing);
          return;
        }
        const timer = setTimeout(() => reject(new Error("Timed out waiting for a push")), timeoutMs);
        socket.on("message", (raw: Buffer) => {
          const message = JSON.parse(raw.toString("utf8")) as SimulatorServerMessage;
          if (message.type === "push") {
            clearTimeout(timer);
            resolve(message);
          }
        });
      }),
  };
}

function signedWebhookInit(payload: unknown): RequestInit {
  const body = JSON.stringify(payload);
  return {
    method: "POST",
    body,
    headers: {
      [INTERNAL_WEBHOOK_SIGNATURE_HEADER]: computeWebhookSignature(
        body,
        config.INTERNAL_WEBHOOK_SECRET,
      ),
    },
  };
}

/**
 * The complete path the customer will actually run, over real HTTP and a real
 * WebSocket: operations event -> signed webhook -> alarm -> push -> handset ->
 * authenticated detail fetch -> acknowledgement.
 *
 * The component tests exercise each stage in isolation; this one proves the
 * wiring between them, which is where integration failures actually live.
 */
describe("end-to-end alarm journey", () => {
  test("operations event reaches a phone and the manager acknowledges it", async () => {
    const manager = await db.user.create({
      data: {
        email: "e2e@test.local",
        passwordHash: await hashPassword(PASSWORD),
        displayName: "E2E Manager",
      },
    });

    // 1. The manager logs in from the app.
    const login = await api("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: manager.email, password: PASSWORD }),
    });
    expect(login.status).toBe(200);
    const accessToken: string = login.body.data.accessToken;
    const auth = { authorization: `Bearer ${accessToken}` };

    // 2. The app registers its push token.
    const pushToken = makeSimulatorPushToken("e2e-phone");
    const registered = await api("/v1/devices/register", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ pushToken, platform: "simulator", label: "E2E Phone" }),
    });
    expect(registered.status).toBe(200);

    // 3. The handset opens its push channel.
    const phone = connectPhone(pushToken);
    await phone.opened;

    // 4. The operations server raises an alarm.
    const webhook = await api(
      "/v1/internal/alarms",
      signedWebhookInit({
        eventId: "e2e-event-1",
        source: "operations-server",
        severity: "critical",
        title: "Temperature limit exceeded",
        body: "Server room temperature is above the configured limit.",
        occurredAt: new Date().toISOString(),
        dedupKey: "temperature:server-room-1",
        recipientUserIds: [manager.id],
        details: { site: "main-site", value: 42.5, threshold: 35 },
      }),
    );
    expect(webhook.status).toBe(200);
    const alarmId: string = webhook.body.data.alarmId;

    // 5. The push arrives at the handset carrying an ID and nothing else.
    const push = await phone.waitForPush();
    if (push.type !== "push") throw new Error("expected a push");
    // Identifier plus timestamps, and nothing more. The measured value stays
    // behind the authenticated API.
    expect(Object.keys(push.envelope.data).sort()).toEqual([
      "alarmId",
      "occurredAt",
      "sentAt",
      "type",
    ]);
    expect(push.envelope.data.alarmId).toBe(alarmId);
    expect(JSON.stringify(push.envelope)).not.toContain("42.5");

    // A reader must be able to tell when the condition happened and when we
    // tried to tell them, without opening anything.
    expect(push.envelope.body).toContain("發生");
    expect(push.envelope.body).toContain("發送");

    // 6. Tapping the notification fetches the details over the authenticated API.
    const detail = await api(`/v1/alarms/${alarmId}`, { headers: auth });
    expect(detail.status).toBe(200);
    expect(detail.body.data.details).toEqual({ site: "main-site", value: 42.5, threshold: 35 });

    // 7. The receipt settles and the ledger records that the handset confirmed.
    await receipts.processOnce();
    const ledger = await api(`/v1/admin/alarms/${alarmId}/ledger`);
    expect(ledger.body.data.recipients[0].state).toBe("DELIVERED");
    expect(ledger.body.data.recipients[0].devices[0].status).toBe("DEVICE_CONFIRMED");

    // 8. The manager acknowledges, then resolves.
    const acked = await api(`/v1/alarms/${alarmId}/ack`, { method: "POST", headers: auth });
    expect(acked.body.data.state).toBe("ACKED");

    const resolved = await api(`/v1/alarms/${alarmId}/resolve`, { method: "POST", headers: auth });
    expect(resolved.body.data.state).toBe("RESOLVED");

    // 9. Unread count clears once the alarm is read.
    await api(`/v1/alarms/${alarmId}/read`, { method: "POST", headers: auth });
    const unread = await api("/v1/alarms/unread-count", { headers: auth });
    expect(unread.body.data.unreadCount).toBe(0);
  });

  test("a replayed operations event never produces a second notification", async () => {
    const manager = await db.user.create({
      data: { email: "e2e-replay@test.local", passwordHash: await hashPassword(PASSWORD) },
    });

    const login = await api("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: manager.email, password: PASSWORD }),
    });
    const auth = { authorization: `Bearer ${login.body.data.accessToken}` };

    const pushToken = makeSimulatorPushToken("e2e-replay-phone");
    await api("/v1/devices/register", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ pushToken, platform: "simulator" }),
    });

    const phone = connectPhone(pushToken);
    await phone.opened;

    const payload = {
      eventId: "e2e-replay-1",
      source: "operations-server",
      severity: "warning",
      title: "Disk usage high",
      body: "Volume /var is at 91%.",
      occurredAt: new Date().toISOString(),
      recipientUserIds: [manager.id],
    };

    const first = await api("/v1/internal/alarms", signedWebhookInit(payload));
    await phone.waitForPush();

    const second = await api("/v1/internal/alarms", signedWebhookInit(payload));
    const third = await api("/v1/internal/alarms", signedWebhookInit(payload));

    expect(first.body.data.duplicate).toBe(false);
    expect(second.body.data.duplicate).toBe(true);
    expect(third.body.data.duplicate).toBe(true);

    // Give any erroneous extra push time to arrive before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(phone.pushes()).toHaveLength(1);
  });

  test("an unsigned webhook is rejected before any alarm exists", async () => {
    const manager = await db.user.create({
      data: { email: "e2e-unsigned@test.local", passwordHash: await hashPassword(PASSWORD) },
    });

    const response = await api("/v1/internal/alarms", {
      method: "POST",
      body: JSON.stringify({
        eventId: "e2e-unsigned-1",
        source: "operations-server",
        severity: "critical",
        title: "Forged alarm",
        body: "This should never be stored.",
        occurredAt: new Date().toISOString(),
        recipientUserIds: [manager.id],
      }),
    });

    expect(response.status).toBe(401);
    expect(await db.alarm.count()).toBe(0);
  });

  test("an uninstalled app is detected by the receipt and the device deactivated", async () => {
    const manager = await db.user.create({
      data: { email: "e2e-uninstall@test.local", passwordHash: await hashPassword(PASSWORD) },
    });

    const login = await api("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: manager.email, password: PASSWORD }),
    });
    const auth = { authorization: `Bearer ${login.body.data.accessToken}` };

    const pushToken = makeSimulatorPushToken("e2e-uninstall-phone");
    await api("/v1/devices/register", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ pushToken, platform: "simulator" }),
    });

    const phone = connectPhone(pushToken);
    await phone.opened;

    await api(
      "/v1/internal/alarms",
      signedWebhookInit({
        eventId: "e2e-uninstall-1",
        source: "operations-server",
        severity: "info",
        title: "Routine check",
        body: "Nothing is wrong.",
        occurredAt: new Date().toISOString(),
        recipientUserIds: [manager.id],
      }),
    );
    await phone.waitForPush();

    // The user uninstalls the app after the push was already accepted.
    const uninstall = await api("/v1/admin/simulator/uninstall", {
      method: "POST",
      body: JSON.stringify({ pushToken }),
    });
    expect(uninstall.status).toBe(200);

    // Registration is still active: nothing has told the server otherwise yet.
    const before = await db.device.findUniqueOrThrow({ where: { pushToken } });
    expect(before.active).toBe(true);

    // Only the receipt reveals it - which is exactly how it happens in production.
    const summary = await receipts.processOnce();
    expect(summary.invalidToken).toBe(1);

    const after = await db.device.findUniqueOrThrow({ where: { pushToken } });
    expect(after.active).toBe(false);
  });
});
