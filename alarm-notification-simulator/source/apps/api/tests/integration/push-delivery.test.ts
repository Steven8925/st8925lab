import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { makeSimulatorPushToken, type SimulatorServerMessage } from "@alarm/contracts";
import { AlarmPushDispatcher } from "../../src/notifications/dispatch.js";
import { ReceiptProcessor } from "../../src/notifications/receipts.js";
import { SimulatorDeviceHub } from "../../src/notifications/simulator/hub.js";
import { SimulatorPushProvider } from "../../src/notifications/simulator/provider.js";
import { createTestDatabase } from "../helpers/db.js";
import type { TestDatabase } from "../helpers/db.js";
import { hashPassword } from "../../src/auth/password.js";
import type { Db } from "../../src/db/prisma.js";

let database: TestDatabase;
let db: Db;
let hub: SimulatorDeviceHub;
let provider: SimulatorPushProvider;
let dispatcher: AlarmPushDispatcher;
let receipts: ReceiptProcessor;

beforeEach(async () => {
  database = await createTestDatabase();
  db = database.db;
  hub = new SimulatorDeviceHub();
  provider = new SimulatorPushProvider(hub);
  dispatcher = new AlarmPushDispatcher(db, provider);
  // minAgeMs 0 so tests settle receipts deterministically instead of sleeping.
  receipts = new ReceiptProcessor(db, provider, { minAgeMs: 0 });
});

afterEach(async () => {
  await database.destroy();
});

async function makeUser(email: string) {
  return db.user.create({
    data: { email, passwordHash: await hashPassword("x"), role: "MANAGER" },
  });
}

async function makeDevice(userId: string, label: string, token = makeSimulatorPushToken(label)) {
  return db.device.create({
    data: { userId, pushToken: token, platform: "SIMULATOR", label },
  });
}

async function makeAlarm(recipientUserIds: string[], severity = "CRITICAL") {
  const alarm = await db.alarm.create({
    data: {
      source: "test",
      severity,
      title: "Temperature limit exceeded",
      body: "Server room is too hot.",
      occurredAt: new Date(),
    },
  });
  await db.alarmRecipient.createMany({
    data: recipientUserIds.map((userId) => ({ alarmId: alarm.id, userId })),
  });
  return alarm;
}

/** A simulated handset that acknowledges every push it receives. */
function connectPhone(token: string, deviceId: string, options: { autoAck?: boolean } = {}) {
  const received: SimulatorServerMessage[] = [];
  const disconnect = hub.connect(token, deviceId, (message) => {
    received.push(message);
    if (options.autoAck !== false && message.type === "push") {
      hub.confirmDelivery(message.envelope.ticketId);
    }
  });
  return { received, disconnect, pushes: () => received.filter((m) => m.type === "push") };
}

describe("fan-out", () => {
  test("sends to every active device of every recipient", async () => {
    const alice = await makeUser("a@test.local");
    const bob = await makeUser("b@test.local");
    const alicePhone = await makeDevice(alice.id, "alice-phone");
    const aliceTablet = await makeDevice(alice.id, "alice-tablet");
    const bobPhone = await makeDevice(bob.id, "bob-phone");

    connectPhone(alicePhone.pushToken, alicePhone.id);
    connectPhone(aliceTablet.pushToken, aliceTablet.id);
    connectPhone(bobPhone.pushToken, bobPhone.id);

    const alarm = await makeAlarm([alice.id, bob.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-1");

    const deliveries = await db.pushDelivery.findMany({ where: { alarmId: alarm.id } });
    expect(deliveries).toHaveLength(3);
    expect(deliveries.every((delivery) => delivery.status === "ACCEPTED")).toBe(true);
  });

  test("skips inactive devices", async () => {
    const user = await makeUser("inactive-dev@test.local");
    const active = await makeDevice(user.id, "active-phone");
    const dead = await makeDevice(user.id, "dead-phone");
    await db.device.update({ where: { id: dead.id }, data: { active: false } });

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-2");

    const deliveries = await db.pushDelivery.findMany({ where: { alarmId: alarm.id } });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.deviceId).toBe(active.id);
  });

  test("the push payload carries an alarm id and no alarm content", async () => {
    const user = await makeUser("payload@test.local");
    const device = await makeDevice(user.id, "payload-phone");
    const phone = connectPhone(device.pushToken, device.id);

    const alarm = await db.alarm.create({
      data: {
        source: "test",
        severity: "CRITICAL",
        title: "Coolant leak",
        body: "Rack R12 coolant pressure lost.",
        details: JSON.stringify({ secret: "customer-account-number-1234" }),
        occurredAt: new Date(),
      },
    });
    await db.alarmRecipient.create({ data: { alarmId: alarm.id, userId: user.id } });

    await dispatcher.sendForAlarm(alarm.id, "req-3");

    const push = phone.pushes()[0];
    expect(push).toBeDefined();
    if (push?.type !== "push") throw new Error("expected a push message");

    /**
     * The payload carries an identifier and the two timestamps - and nothing
     * else. Asserting the exact key set is deliberate: it fails the moment
     * anyone adds a field, which is how alarm content leaks into a transport
     * that passes through Google and Apple and lands on a lock screen.
     */
    expect(Object.keys(push.envelope.data).sort()).toEqual([
      "alarmId",
      "occurredAt",
      "sentAt",
      "type",
    ]);
    expect(push.envelope.data.alarmId).toBe(alarm.id);
    expect(push.envelope.data.occurredAt).toBe(alarm.occurredAt.toISOString());

    // Structured details must never travel through the push transport.
    expect(JSON.stringify(push.envelope)).not.toContain("customer-account-number-1234");
  });

  test("both timestamps appear in the notification body a lock screen would show", async () => {
    const user = await makeUser("stamps@test.local");
    const device = await makeDevice(user.id, "stamps-phone");
    const phone = connectPhone(device.pushToken, device.id);

    const occurredAt = new Date("2026-08-13T07:04:12.000Z");
    const alarm = await db.alarm.create({
      data: {
        source: "test",
        severity: "CRITICAL",
        title: "水溫 紅燈告警",
        body: "TANK-01 水溫 55°C，已超過紅燈門檻 50°C。",
        occurredAt,
      },
    });
    await db.alarmRecipient.create({ data: { alarmId: alarm.id, userId: user.id } });

    await dispatcher.sendForAlarm(alarm.id, "req-stamps");

    const push = phone.pushes()[0];
    if (push?.type !== "push") throw new Error("expected a push message");

    /**
     * Baked into the visible text, not only into `data`: a lock-screen banner
     * renders the body and nothing else, so structured fields alone would leave
     * the reader with no idea when the condition actually happened.
     */
    expect(push.envelope.body).toContain(alarm.body);
    expect(push.envelope.body).toContain("發生");
    expect(push.envelope.body).toContain("發送");

    // The zone is always stated. An alarm time with no zone lets the reader be
    // hours wrong about whether the tank is boiling now or boiled last night.
    expect(push.envelope.body).toMatch(/GMT[+-]?\d*/);

    // The envelope's own fields must agree with the text.
    expect(push.envelope.occurredAt).toBe(occurredAt.toISOString());
    expect(push.envelope.sentAt).toBe(push.envelope.data.sentAt);
  });

  test("critical alarms are sent at high priority", async () => {
    const user = await makeUser("prio@test.local");
    const device = await makeDevice(user.id, "prio-phone");
    const phone = connectPhone(device.pushToken, device.id);

    const alarm = await makeAlarm([user.id], "CRITICAL");
    await dispatcher.sendForAlarm(alarm.id, "req-4");

    const push = phone.pushes()[0];
    if (push?.type !== "push") throw new Error("expected a push message");
    expect(push.envelope.priority).toBe("high");
  });

  test("a repeat dispatch does not re-notify an already-accepted device", async () => {
    const user = await makeUser("repeat@test.local");
    const device = await makeDevice(user.id, "repeat-phone");
    const phone = connectPhone(device.pushToken, device.id);

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-5");
    await dispatcher.sendForAlarm(alarm.id, "req-5-again");

    expect(phone.pushes()).toHaveLength(1);
    expect(await db.pushDelivery.count({ where: { alarmId: alarm.id } })).toBe(1);
  });
});

describe("chunking", () => {
  test("tickets stay paired with their own device across chunk boundaries", async () => {
    /**
     * The specific bug this guards against (README.md §8.3): keeping a flat
     * deviceIds array and indexing it against each chunk's tickets, which
     * attributes chunk 2's results to chunk 1's devices.
     *
     * maxBatchSize is 100, so 150 devices forces two chunks.
     */
    const user = await makeUser("chunk@test.local");
    const devices = [];
    for (let index = 0; index < 150; index += 1) {
      devices.push(await makeDevice(user.id, `chunk-device-${index}`));
    }

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-chunk");

    const deliveries = await db.pushDelivery.findMany({ where: { alarmId: alarm.id } });
    expect(deliveries).toHaveLength(150);
    expect(deliveries.every((delivery) => delivery.status === "ACCEPTED")).toBe(true);

    // Every ticket must belong to the device it was actually sent for.
    for (const delivery of deliveries) {
      const device = devices.find((candidate) => candidate.id === delivery.deviceId);
      expect(device).toBeDefined();
      const ticket = hub.getTicket(delivery.ticketId ?? "");
      expect(ticket?.token).toBe(device?.pushToken);
    }

    // And every ticket is used exactly once.
    const ticketIds = deliveries.map((delivery) => delivery.ticketId);
    expect(new Set(ticketIds).size).toBe(150);
  });
});

describe("receipts", () => {
  test("a device acknowledgement settles the delivery as DEVICE_CONFIRMED", async () => {
    const user = await makeUser("receipt@test.local");
    const device = await makeDevice(user.id, "receipt-phone");
    connectPhone(device.pushToken, device.id);

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-6");
    const summary = await receipts.processOnce();

    expect(summary.deviceConfirmed).toBe(1);

    const delivery = await db.pushDelivery.findFirstOrThrow({ where: { alarmId: alarm.id } });
    expect(delivery.status).toBe("DEVICE_CONFIRMED");
    expect(delivery.deviceConfirmedAt).not.toBeNull();
  });

  test("an offline device yields DELIVERED without device confirmation", async () => {
    const user = await makeUser("offline@test.local");
    const device = await makeDevice(user.id, "offline-phone");
    // Never connected: the push is queued by the transport.

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-7");
    await receipts.processOnce();

    const delivery = await db.pushDelivery.findFirstOrThrow({ where: { alarmId: alarm.id } });
    // Handed to the transport, handset unknown - precisely the certainty a real
    // FCM receipt provides, and no more.
    expect(delivery.status).toBe("DELIVERED");
    expect(delivery.deviceConfirmedAt).toBeNull();

    const recipient = await db.alarmRecipient.findFirstOrThrow({ where: { alarmId: alarm.id } });
    // Still PENDING: no evidence the phone has it. This is NOT proof of loss.
    expect(recipient.state).toBe("PENDING");
    expect(device.active).toBe(true);
  });

  test("a queued push is delivered when the device reconnects", async () => {
    const user = await makeUser("reconnect@test.local");
    const device = await makeDevice(user.id, "reconnect-phone");

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-8");
    expect(hub.queueDepth(device.pushToken)).toBe(1);

    const phone = connectPhone(device.pushToken, device.id);
    expect(phone.pushes()).toHaveLength(1);
    expect(hub.queueDepth(device.pushToken)).toBe(0);

    await receipts.processOnce();
    const delivery = await db.pushDelivery.findFirstOrThrow({ where: { alarmId: alarm.id } });
    expect(delivery.status).toBe("DEVICE_CONFIRMED");
  });

  test("a suppressed notification proves arrival and non-visibility", async () => {
    const user = await makeUser("suppressed@test.local");
    const device = await makeDevice(user.id, "suppressed-phone");

    hub.connect(device.pushToken, device.id, (message) => {
      if (message.type === "push") {
        // Android 13+ POST_NOTIFICATIONS denied: it arrived, nothing was shown.
        hub.markSuppressed(message.envelope.ticketId, "PERMISSION_DENIED");
      }
    });

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-9");
    const summary = await receipts.processOnce();

    expect(summary.suppressed).toBe(1);
    const delivery = await db.pushDelivery.findFirstOrThrow({ where: { alarmId: alarm.id } });
    expect(delivery.status).toBe("SUPPRESSED");
    // A plain delivery report would have called this a success.
    expect(delivery.deviceConfirmedAt).not.toBeNull();

    /**
     * The person must NOT be advanced.
     *
     * The device received it, so the delivery row is SUPPRESSED - but the human
     * saw nothing, and this ledger tracks the human. Marking them DELIVERED
     * would put a reassuring state next to the manager's name in exactly the
     * case this system exists to expose. The original version of this test
     * asserted only the device row, which is how that defect survived.
     */
    const recipient = await db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId: alarm.id, userId: user.id } },
    });
    expect(recipient.state).toBe("PENDING");
    expect(recipient.deliveredAt).toBeNull();
  });

  test("one suppressed device does not mask another that genuinely delivered", async () => {
    const user = await makeUser("mixed@test.local");
    const blocked = await makeDevice(user.id, "blocked-phone");
    const working = await makeDevice(user.id, "working-phone");

    hub.connect(blocked.pushToken, blocked.id, (message) => {
      if (message.type === "push") hub.markSuppressed(message.envelope.ticketId, "PERMISSION_DENIED");
    });
    connectPhone(working.pushToken, working.id);

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-mixed");
    await receipts.processOnce();

    const deliveries = await db.pushDelivery.findMany({ where: { alarmId: alarm.id } });
    const statuses = deliveries.map((delivery) => delivery.status).sort();
    expect(statuses).toEqual(["DEVICE_CONFIRMED", "SUPPRESSED"]);

    // One working handset is enough to reach the person.
    const recipient = await db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId: alarm.id, userId: user.id } },
    });
    expect(recipient.state).toBe("DELIVERED");
  });

  test("receipts are not consumed twice", async () => {
    const user = await makeUser("once@test.local");
    const device = await makeDevice(user.id, "once-phone");
    connectPhone(device.pushToken, device.id);

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-10");

    const first = await receipts.processOnce();
    const second = await receipts.processOnce();

    expect(first.checked).toBe(1);
    // Settled deliveries leave the ACCEPTED queue and are not re-polled.
    expect(second.checked).toBe(0);
  });
});

describe("dead token cleanup", () => {
  test("DeviceNotRegistered deactivates the device and marks the delivery invalid", async () => {
    const user = await makeUser("dead@test.local");
    const device = await makeDevice(user.id, "dead-token-phone");
    connectPhone(device.pushToken, device.id);

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-11");

    // The app is uninstalled AFTER the send - the failure can only surface in
    // the receipt, which is exactly how it reaches a real server.
    hub.uninstall(device.pushToken);

    const summary = await receipts.processOnce();
    expect(summary.invalidToken).toBe(1);

    const delivery = await db.pushDelivery.findFirstOrThrow({ where: { alarmId: alarm.id } });
    expect(delivery.status).toBe("INVALID_TOKEN");

    const refreshed = await db.device.findUniqueOrThrow({ where: { id: device.id } });
    // Deactivated, not deleted: the row is the evidence for "why did alarms
    // stop reaching this manager".
    expect(refreshed.active).toBe(false);
  });

  test("a deactivated device is excluded from the next alarm", async () => {
    const user = await makeUser("excluded@test.local");
    const device = await makeDevice(user.id, "excluded-phone");
    connectPhone(device.pushToken, device.id);

    const first = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(first.id, "req-12");
    hub.uninstall(device.pushToken);
    await receipts.processOnce();

    const second = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(second.id, "req-13");

    expect(await db.pushDelivery.count({ where: { alarmId: second.id } })).toBe(0);
    const recipient = await db.alarmRecipient.findFirstOrThrow({ where: { alarmId: second.id } });
    expect(recipient.state).toBe("UNDELIVERABLE");
    expect(recipient.undeliverableReason).toBe("NO_ACTIVE_DEVICE");
  });
});

describe("recipient ledger", () => {
  test("a recipient with no device is marked undeliverable, not left pending", async () => {
    const withPhone = await makeUser("has-phone@test.local");
    const withoutPhone = await makeUser("no-phone@test.local");
    const device = await makeDevice(withPhone.id, "only-phone");
    connectPhone(device.pushToken, device.id);

    const alarm = await makeAlarm([withPhone.id, withoutPhone.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-14");
    await receipts.processOnce();

    const reachable = await db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId: alarm.id, userId: withPhone.id } },
    });
    const unreachable = await db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId: alarm.id, userId: withoutPhone.id } },
    });

    expect(reachable.state).toBe("DELIVERED");
    // The distinction that makes partial delivery safe to accept: this is not
    // "waiting for an acknowledgement", it is "never had a chance of arriving".
    expect(unreachable.state).toBe("UNDELIVERABLE");
    expect(unreachable.undeliverableReason).toBe("NO_ACTIVE_DEVICE");
  });

  test("delivery to one of several devices is enough to mark the person delivered", async () => {
    const user = await makeUser("multi@test.local");
    const online = await makeDevice(user.id, "online-phone");
    await makeDevice(user.id, "offline-tablet");
    connectPhone(online.pushToken, online.id);

    const alarm = await makeAlarm([user.id]);
    await dispatcher.sendForAlarm(alarm.id, "req-15");
    await receipts.processOnce();

    const recipient = await db.alarmRecipient.findFirstOrThrow({ where: { alarmId: alarm.id } });
    expect(recipient.state).toBe("DELIVERED");
  });
});
