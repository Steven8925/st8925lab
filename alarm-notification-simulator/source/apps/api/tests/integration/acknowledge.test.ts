import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { authHeaders, createHarness, createUser, login, postWebhook } from "../helpers/app.js";
import type { TestHarness } from "../helpers/app.js";

let harness: TestHarness;

beforeEach(async () => {
  harness = await createHarness();
});

afterEach(async () => {
  await harness.destroy();
});

async function createAlarmFor(recipientUserIds: string[], overrides: Record<string, unknown> = {}) {
  const response = await postWebhook(harness, {
    eventId: `evt-${Math.random().toString(36).slice(2)}`,
    source: "operations-server",
    severity: "critical",
    title: "Coolant pressure lost",
    body: "Rack R12 coolant pressure is below the safe limit.",
    occurredAt: new Date().toISOString(),
    recipientUserIds,
    ...overrides,
  });

  if (response.statusCode !== 200) {
    throw new Error(`alarm creation failed: ${response.body}`);
  }
  return response.json().data.alarmId as string;
}

describe("acknowledge", () => {
  test("moves the recipient to ACKED and records the timestamp", async () => {
    const user = await createUser(harness.db, { email: "ack@test.local" });
    const alarmId = await createAlarmFor([user.id]);
    const session = await login(harness, user.email);

    const response = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/ack`,
      headers: authHeaders(session.accessToken),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.state).toBe("ACKED");
    expect(response.json().data.ackedAt).not.toBeNull();
    expect(response.json().data.changed).toBe(true);
  });

  test("is idempotent and keeps the first timestamp", async () => {
    const user = await createUser(harness.db, { email: "ack-idem@test.local" });
    const alarmId = await createAlarmFor([user.id]);
    const session = await login(harness, user.email);

    const first = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/ack`,
      headers: authHeaders(session.accessToken),
    });
    const second = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/ack`,
      headers: authHeaders(session.accessToken),
    });

    expect(second.statusCode).toBe(200);
    expect(second.json().data.ackedAt).toBe(first.json().data.ackedAt);
    // "When did the manager first see this" must not drift on a repeat tap.
    expect(second.json().data.changed).toBe(false);
  });

  test("is per user - one manager acknowledging does not answer for another", async () => {
    const alice = await createUser(harness.db, { email: "ack-a@test.local" });
    const bob = await createUser(harness.db, { email: "ack-b@test.local" });
    const alarmId = await createAlarmFor([alice.id, bob.id]);

    const aliceSession = await login(harness, alice.email);
    await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/ack`,
      headers: authHeaders(aliceSession.accessToken),
    });

    const aliceRow = await harness.db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId, userId: alice.id } },
    });
    const bobRow = await harness.db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId, userId: bob.id } },
    });

    expect(aliceRow.state).toBe("ACKED");
    // The ALL policy: Bob's silence is still visible and still outstanding.
    expect(bobRow.state).not.toBe("ACKED");
    expect(bobRow.ackedAt).toBeNull();
  });

  test("another user's alarm returns 404 and records nothing", async () => {
    const owner = await createUser(harness.db, { email: "ack-owner@test.local" });
    const stranger = await createUser(harness.db, { email: "ack-stranger@test.local" });
    const alarmId = await createAlarmFor([owner.id]);
    const session = await login(harness, stranger.email);

    const response = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/ack`,
      headers: authHeaders(session.accessToken),
    });

    expect(response.statusCode).toBe(404);
    const ownerRow = await harness.db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId, userId: owner.id } },
    });
    expect(ownerRow.state).toBe("PENDING");
  });

  test("requires authentication", async () => {
    const user = await createUser(harness.db, { email: "ack-anon@test.local" });
    const alarmId = await createAlarmFor([user.id]);

    const response = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/ack`,
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("resolve", () => {
  test("is a distinct state from acknowledge", async () => {
    const user = await createUser(harness.db, { email: "resolve@test.local" });
    const alarmId = await createAlarmFor([user.id]);
    const session = await login(harness, user.email);

    await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/ack`,
      headers: authHeaders(session.accessToken),
    });

    const afterAck = await harness.db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId, userId: user.id } },
    });
    expect(afterAck.state).toBe("ACKED");
    // Acknowledging is not fixing: resolvedAt must still be empty.
    expect(afterAck.resolvedAt).toBeNull();

    const resolved = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/resolve`,
      headers: authHeaders(session.accessToken),
    });

    expect(resolved.json().data.state).toBe("RESOLVED");
    expect(resolved.json().data.resolvedAt).not.toBeNull();
  });

  test("resolving without acknowledging first implies the acknowledgement", async () => {
    const user = await createUser(harness.db, { email: "resolve-direct@test.local" });
    const alarmId = await createAlarmFor([user.id]);
    const session = await login(harness, user.email);

    const response = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/resolve`,
      headers: authHeaders(session.accessToken),
    });

    // You cannot have fixed something you never saw.
    expect(response.json().data.state).toBe("RESOLVED");
    expect(response.json().data.ackedAt).not.toBeNull();
  });

  test("acknowledging after resolving does not regress the state", async () => {
    const user = await createUser(harness.db, { email: "no-regress@test.local" });
    const alarmId = await createAlarmFor([user.id]);
    const session = await login(harness, user.email);

    await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/resolve`,
      headers: authHeaders(session.accessToken),
    });
    const late = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/ack`,
      headers: authHeaders(session.accessToken),
    });

    expect(late.json().data.state).toBe("RESOLVED");
    expect(late.json().data.changed).toBe(false);
  });
});

describe("partial recipient resolution", () => {
  test("an unknown recipient no longer rejects the whole alarm", async () => {
    const alice = await createUser(harness.db, { email: "partial-a@test.local" });
    const bob = await createUser(harness.db, { email: "partial-b@test.local" });

    const response = await postWebhook(harness, {
      eventId: "evt-partial-1",
      source: "operations-server",
      severity: "critical",
      title: "UPS battery fault",
      body: "UPS-2 reported a battery fault.",
      occurredAt: new Date().toISOString(),
      recipientUserIds: [alice.id, bob.id, "99999999-9999-4999-8999-999999999999"],
    });

    expect(response.statusCode).toBe(200);
    const alarmId = response.json().data.alarmId;

    // Reaching two of three beats reaching nobody...
    expect(await harness.db.alarmRecipient.count({ where: { alarmId } })).toBe(2);

    // ...provided the third failure is recorded rather than silently dropped.
    const unresolved = await harness.db.alarmUnresolvedRecipient.findMany({ where: { alarmId } });
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]?.reason).toBe("UNKNOWN_USER");
  });

  test("distinguishes a deactivated account from one that never existed", async () => {
    const active = await createUser(harness.db, { email: "still-here@test.local" });
    const departed = await createUser(harness.db, { email: "left@test.local", active: false });

    const response = await postWebhook(harness, {
      eventId: "evt-partial-2",
      source: "operations-server",
      severity: "warning",
      title: "Disk usage high",
      body: "Volume /var is at 91%.",
      occurredAt: new Date().toISOString(),
      recipientUserIds: [active.id, departed.id, "11111111-1111-4111-8111-111111111111"],
    });

    const alarmId = response.json().data.alarmId;
    const unresolved = await harness.db.alarmUnresolvedRecipient.findMany({
      where: { alarmId },
      orderBy: { reason: "asc" },
    });

    // Different reasons need different fixes by different people: one is a
    // stale config entry, the other is an offboarded employee.
    expect(unresolved.map((entry) => entry.reason).sort()).toEqual([
      "INACTIVE_USER",
      "UNKNOWN_USER",
    ]);
  });

  test("an alarm nobody can receive is still stored and loudly flagged", async () => {
    const response = await postWebhook(harness, {
      eventId: "evt-nobody",
      source: "operations-server",
      severity: "critical",
      title: "Fire suppression triggered",
      body: "Fire suppression discharged in room 3.",
      occurredAt: new Date().toISOString(),
      recipientUserIds: ["22222222-2222-4222-8222-222222222222"],
    });

    expect(response.statusCode).toBe(200);
    const alarmId = response.json().data.alarmId;

    // Discarding it would destroy the only evidence the source system tried.
    const alarm = await harness.db.alarm.findUnique({ where: { id: alarmId } });
    expect(alarm).not.toBeNull();
    expect(await harness.db.alarmRecipient.count({ where: { alarmId } })).toBe(0);
    expect(await harness.db.alarmUnresolvedRecipient.count({ where: { alarmId } })).toBe(1);
  });

  test("the response tells the source system exactly who could not be reached", async () => {
    const user = await createUser(harness.db, { email: "reported@test.local" });

    const response = await postWebhook(harness, {
      eventId: "evt-reported",
      source: "operations-server",
      severity: "info",
      title: "Nightly backup finished",
      body: "Backup completed in 42 minutes.",
      occurredAt: new Date().toISOString(),
      recipientUserIds: [user.id, "33333333-3333-4333-8333-333333333333"],
    });

    const data = response.json().data;
    // Without this the integrator sees HTTP 200 and assumes everyone was told.
    expect(data.recipientCount).toBe(1);
    expect(data.unresolvedRecipients).toHaveLength(1);
    expect(data.unresolvedRecipients[0].reason).toBe("UNKNOWN_USER");
  });
});
