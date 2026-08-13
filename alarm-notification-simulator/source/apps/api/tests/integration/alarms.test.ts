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

async function createAlarmFor(userIds: string[], overrides: Record<string, unknown> = {}) {
  const response = await postWebhook(harness, {
    eventId: `evt-${Math.random().toString(36).slice(2)}`,
    source: "operations-server",
    severity: "warning",
    title: "Disk usage high",
    body: "Volume /var is at 91%.",
    occurredAt: new Date().toISOString(),
    recipientUserIds: userIds,
    details: { volume: "/var" },
    ...overrides,
  });

  if (response.statusCode !== 200) {
    throw new Error(`alarm creation failed: ${response.body}`);
  }
  return response.json().data.alarmId as string;
}

describe("alarm authorisation", () => {
  test("another user's alarm returns 404, not 403", async () => {
    const owner = await createUser(harness.db, { email: "owner@test.local" });
    const stranger = await createUser(harness.db, { email: "stranger@test.local" });
    const alarmId = await createAlarmFor([owner.id]);

    const session = await login(harness, stranger.email);
    const response = await harness.app.inject({
      method: "GET",
      url: `/v1/alarms/${alarmId}`,
      headers: authHeaders(session.accessToken),
    });

    // 403 would confirm the alarm exists. 404 reveals nothing.
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");
  });

  test("a nonexistent alarm returns the identical response as an unauthorised one", async () => {
    const owner = await createUser(harness.db, { email: "owner2@test.local" });
    const stranger = await createUser(harness.db, { email: "stranger2@test.local" });
    const realAlarmId = await createAlarmFor([owner.id]);
    const session = await login(harness, stranger.email);

    const unauthorised = await harness.app.inject({
      method: "GET",
      url: `/v1/alarms/${realAlarmId}`,
      headers: authHeaders(session.accessToken),
    });
    const nonexistent = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms/00000000-0000-4000-8000-000000000000",
      headers: authHeaders(session.accessToken),
    });

    expect(unauthorised.statusCode).toBe(nonexistent.statusCode);
    expect(unauthorised.json().error.code).toBe(nonexistent.json().error.code);
    expect(unauthorised.json().error.message).toBe(nonexistent.json().error.message);
  });

  test("marking another user's alarm read returns 404 and records nothing", async () => {
    const owner = await createUser(harness.db, { email: "owner3@test.local" });
    const stranger = await createUser(harness.db, { email: "stranger3@test.local" });
    const alarmId = await createAlarmFor([owner.id]);
    const session = await login(harness, stranger.email);

    const response = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/read`,
      headers: authHeaders(session.accessToken),
    });

    expect(response.statusCode).toBe(404);
    expect(await harness.db.alarmRead.count()).toBe(0);
  });

  test("requires authentication", async () => {
    const response = await harness.app.inject({ method: "GET", url: "/v1/alarms" });
    expect(response.statusCode).toBe(401);
  });

  test("rejects a non-UUID alarm id", async () => {
    const user = await createUser(harness.db, { email: "uuid@test.local" });
    const session = await login(harness, user.email);

    const response = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms/not-a-uuid",
      headers: authHeaders(session.accessToken),
    });

    expect(response.statusCode).toBe(400);
  });

  test("a deactivated account loses access while holding a valid token", async () => {
    const user = await createUser(harness.db, { email: "revoked@test.local" });
    const session = await login(harness, user.email);

    await harness.db.user.update({ where: { id: user.id }, data: { active: false } });

    const response = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms",
      headers: authHeaders(session.accessToken),
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("read state", () => {
  test("is per user", async () => {
    const alice = await createUser(harness.db, { email: "alice@test.local" });
    const bob = await createUser(harness.db, { email: "bob@test.local" });
    const alarmId = await createAlarmFor([alice.id, bob.id]);

    const aliceSession = await login(harness, alice.email);
    const bobSession = await login(harness, bob.email);

    await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/read`,
      headers: authHeaders(aliceSession.accessToken),
    });

    const aliceCount = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms/unread-count",
      headers: authHeaders(aliceSession.accessToken),
    });
    const bobCount = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms/unread-count",
      headers: authHeaders(bobSession.accessToken),
    });

    expect(aliceCount.json().data.unreadCount).toBe(0);
    expect(bobCount.json().data.unreadCount).toBe(1);
  });

  test("marking read is idempotent and preserves the original timestamp", async () => {
    const user = await createUser(harness.db, { email: "idem@test.local" });
    const alarmId = await createAlarmFor([user.id]);
    const session = await login(harness, user.email);

    const first = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/read`,
      headers: authHeaders(session.accessToken),
    });
    const second = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/read`,
      headers: authHeaders(session.accessToken),
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    // The timestamp answers "when did the manager first see this" - a second
    // call must not move it forward.
    expect(second.json().data.readAt).toBe(first.json().data.readAt);
    expect(await harness.db.alarmRead.count()).toBe(1);
  });
});

describe("alarm list", () => {
  test("only returns alarms the caller is a recipient of", async () => {
    const alice = await createUser(harness.db, { email: "list-a@test.local" });
    const bob = await createUser(harness.db, { email: "list-b@test.local" });

    await createAlarmFor([alice.id], { title: "For Alice" });
    await createAlarmFor([bob.id], { title: "For Bob" });

    const session = await login(harness, alice.email);
    const response = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms",
      headers: authHeaders(session.accessToken),
    });

    const items = response.json().data.items;
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("For Alice");
  });

  test("filters by unread status and severity", async () => {
    const user = await createUser(harness.db, { email: "filter@test.local" });
    const readAlarm = await createAlarmFor([user.id], { severity: "info", title: "Info alarm" });
    await createAlarmFor([user.id], { severity: "critical", title: "Critical alarm" });

    const session = await login(harness, user.email);
    await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${readAlarm}/read`,
      headers: authHeaders(session.accessToken),
    });

    const unread = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms?status=unread",
      headers: authHeaders(session.accessToken),
    });
    expect(unread.json().data.items).toHaveLength(1);
    expect(unread.json().data.items[0].title).toBe("Critical alarm");

    const critical = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms?severity=CRITICAL",
      headers: authHeaders(session.accessToken),
    });
    expect(critical.json().data.items).toHaveLength(1);
  });

  test("cursor pagination returns every alarm exactly once", async () => {
    const user = await createUser(harness.db, { email: "page@test.local" });
    const total = 7;
    for (let index = 0; index < total; index += 1) {
      await createAlarmFor([user.id], { title: `Alarm ${index}` });
    }

    const session = await login(harness, user.email);
    const seen: string[] = [];
    let cursor: string | null = null;
    let guard = 0;

    do {
      const url: string = cursor
        ? `/v1/alarms?limit=3&cursor=${encodeURIComponent(cursor)}`
        : "/v1/alarms?limit=3";
      const response = await harness.app.inject({
        method: "GET",
        url,
        headers: authHeaders(session.accessToken),
      });
      const data = response.json().data;
      seen.push(...data.items.map((item: { id: string }) => item.id));
      cursor = data.nextCursor;
      guard += 1;
    } while (cursor && guard < 10);

    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total);
  });

  test("rejects a malformed cursor", async () => {
    const user = await createUser(harness.db, { email: "cursor@test.local" });
    const session = await login(harness, user.email);

    const response = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms?cursor=%21%21%21not-a-cursor",
      headers: authHeaders(session.accessToken),
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("alarm detail", () => {
  test("returns structured details that the push payload never carried", async () => {
    const user = await createUser(harness.db, { email: "detail@test.local" });
    const alarmId = await createAlarmFor([user.id], {
      details: { site: "main-site", metric: "temperature", value: 42.5 },
    });
    const session = await login(harness, user.email);

    const response = await harness.app.inject({
      method: "GET",
      url: `/v1/alarms/${alarmId}`,
      headers: authHeaders(session.accessToken),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.details).toEqual({
      site: "main-site",
      metric: "temperature",
      value: 42.5,
    });
  });
});
