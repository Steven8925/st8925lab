import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { INTERNAL_WEBHOOK_SIGNATURE_HEADER } from "@alarm/contracts";
import { makeSimulatorPushToken } from "@alarm/contracts";
import { authHeaders, createHarness, createUser, login, postWebhook } from "../helpers/app.js";
import type { TestHarness } from "../helpers/app.js";

let harness: TestHarness;

beforeEach(async () => {
  harness = await createHarness();
});

afterEach(async () => {
  await harness.destroy();
});

function alarmPayload(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "evt-temp-001",
    source: "operations-server",
    severity: "critical",
    title: "Temperature limit exceeded",
    body: "Server room temperature is above the configured limit.",
    occurredAt: "2026-08-11T10:30:00.000Z",
    dedupKey: "temperature:server-room-1:2026-08-11T10:30",
    details: { site: "main-site", value: 42.5, threshold: 35 },
    ...overrides,
  };
}

describe("POST /v1/internal/alarms - signature", () => {
  test("rejects an unsigned request", async () => {
    const manager = await createUser(harness.db, { email: "m1@test.local" });

    const response = await harness.app.inject({
      method: "POST",
      url: "/v1/internal/alarms",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(alarmPayload({ recipientUserIds: [manager.id] })),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_SIGNATURE");
    expect(await harness.db.alarm.count()).toBe(0);
  });

  test("rejects a request signed with the wrong secret", async () => {
    const manager = await createUser(harness.db, { email: "m2@test.local" });

    const response = await postWebhook(harness, alarmPayload({ recipientUserIds: [manager.id] }), {
      secret: "an-entirely-different-secret-at-least-32-chars",
    });

    expect(response.statusCode).toBe(401);
    expect(await harness.db.alarm.count()).toBe(0);
  });

  test("rejects a malformed signature header without a 500", async () => {
    const manager = await createUser(harness.db, { email: "m3@test.local" });

    const response = await harness.app.inject({
      method: "POST",
      url: "/v1/internal/alarms",
      headers: {
        "content-type": "application/json",
        [INTERNAL_WEBHOOK_SIGNATURE_HEADER]: "not-a-signature",
      },
      payload: JSON.stringify(alarmPayload({ recipientUserIds: [manager.id] })),
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("POST /v1/internal/alarms - validation", () => {
  test("rejects a payload that fails schema validation", async () => {
    const manager = await createUser(harness.db, { email: "m4@test.local" });

    const response = await postWebhook(
      harness,
      alarmPayload({ severity: "extremely-urgent", recipientUserIds: [manager.id] }),
    );

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(await harness.db.alarm.count()).toBe(0);
  });

  /**
   * An unknown recipient used to reject the entire webhook. That was changed
   * deliberately: one stale email in the customer's configuration would break
   * the whole alarm chain. Partial delivery is now accepted BECAUSE the failure
   * is recorded and reported rather than swallowed - see the accompanying
   * assertions, which are what make the looser behaviour safe.
   */
  test("records an unknown recipient instead of discarding the alarm", async () => {
    const response = await postWebhook(
      harness,
      alarmPayload({ recipientUserIds: ["99999999-9999-4999-8999-999999999999"] }),
    );

    expect(response.statusCode).toBe(200);
    expect(response.json().data.recipientCount).toBe(0);
    expect(response.json().data.unresolvedRecipients).toHaveLength(1);
    expect(await harness.db.alarm.count()).toBe(1);
  });

  test("records an inactive recipient with a distinguishable reason", async () => {
    const inactive = await createUser(harness.db, { email: "gone@test.local", active: false });

    const response = await postWebhook(harness, alarmPayload({ recipientUserIds: [inactive.id] }));

    expect(response.statusCode).toBe(200);
    expect(response.json().data.unresolvedRecipients[0].reason).toBe("INACTIVE_USER");
  });
});

describe("POST /v1/internal/alarms - deduplication", () => {
  test("the same eventId delivered twice creates one alarm and one dispatch", async () => {
    const manager = await createUser(harness.db, { email: "dedup@test.local" });
    const payload = alarmPayload({ recipientUserIds: [manager.id] });

    const first = await postWebhook(harness, payload);
    const second = await postWebhook(harness, payload);

    expect(first.statusCode).toBe(200);
    expect(first.json().data.duplicate).toBe(false);

    expect(second.statusCode).toBe(200);
    expect(second.json().data.duplicate).toBe(true);
    expect(second.json().data.alarmId).toBe(first.json().data.alarmId);

    expect(await harness.db.alarm.count()).toBe(1);
    // The critical assertion: a retry must not notify the manager twice.
    expect(harness.dispatcher.calls).toHaveLength(1);
  });

  test("a different eventId carrying the same dedupKey does not create a second alarm", async () => {
    const manager = await createUser(harness.db, { email: "flap@test.local" });

    const first = await postWebhook(
      harness,
      alarmPayload({ eventId: "evt-a", recipientUserIds: [manager.id] }),
    );
    const second = await postWebhook(
      harness,
      alarmPayload({ eventId: "evt-b", recipientUserIds: [manager.id] }),
    );

    expect(first.json().data.duplicate).toBe(false);
    expect(second.json().data.duplicate).toBe(true);
    expect(second.json().data.alarmId).toBe(first.json().data.alarmId);

    expect(await harness.db.alarm.count()).toBe(1);
    expect(harness.dispatcher.calls).toHaveLength(1);
    // Both deliveries are still recorded, so the audit trail is complete.
    expect(await harness.db.webhookEvent.count()).toBe(2);
  });

  test("distinct events without a dedupKey each create an alarm", async () => {
    const manager = await createUser(harness.db, { email: "distinct@test.local" });

    await postWebhook(
      harness,
      alarmPayload({ eventId: "evt-1", dedupKey: undefined, recipientUserIds: [manager.id] }),
    );
    await postWebhook(
      harness,
      alarmPayload({ eventId: "evt-2", dedupKey: undefined, recipientUserIds: [manager.id] }),
    );

    expect(await harness.db.alarm.count()).toBe(2);
    expect(harness.dispatcher.calls).toHaveLength(2);
  });

  test("concurrent delivery of the same event still yields exactly one alarm", async () => {
    const manager = await createUser(harness.db, { email: "race@test.local" });
    const payload = alarmPayload({ eventId: "evt-race", recipientUserIds: [manager.id] });

    const responses = await Promise.all([
      postWebhook(harness, payload),
      postWebhook(harness, payload),
      postWebhook(harness, payload),
    ]);

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
    }

    const alarmIds = new Set(responses.map((response) => response.json().data.alarmId));
    expect(alarmIds.size).toBe(1);
    expect(await harness.db.alarm.count()).toBe(1);
    expect(harness.dispatcher.calls).toHaveLength(1);
  });
});

describe("POST /v1/internal/alarms - adapters", () => {
  test("translates the legacy format and resolves recipients by email", async () => {
    const manager = await createUser(harness.db, { email: "legacy@test.local" });

    const response = await postWebhook(
      harness,
      {
        id: "LEGACY-1",
        system: "legacy-ops",
        level: 2,
        subject: "Disk usage high",
        text: "Volume /var is at 91%.",
        ts: 1786527000,
        notify: ["legacy@test.local"],
        meta: { volume: "/var" },
      },
      { format: "legacy-ops-v1" },
    );

    expect(response.statusCode).toBe(200);

    const alarm = await harness.db.alarm.findFirstOrThrow();
    expect(alarm.severity).toBe("WARNING");
    expect(alarm.source).toBe("legacy-ops");
    expect(alarm.title).toBe("Disk usage high");
    expect(JSON.parse(alarm.details)).toEqual({ volume: "/var" });

    const recipients = await harness.db.alarmRecipient.findMany();
    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.userId).toBe(manager.id);
  });

  test("rejects an unknown source format", async () => {
    const response = await postWebhook(harness, {}, { format: "acme-v9" });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toMatch(/Unknown source format/);
  });
});

/**
 * The end-to-end scenario specified in README.md §13.2.
 */
describe("README §13.2 integration scenario", () => {
  test("two devices, one alarm, replay is a no-op, read clears the count", async () => {
    // 1. Create manager
    const manager = await createUser(harness.db, { email: "scenario@test.local" });
    const session = await login(harness, manager.email);

    // 2. Register two devices
    for (const label of ["Pixel 8", "Galaxy S24"]) {
      const response = await harness.app.inject({
        method: "POST",
        url: "/v1/devices/register",
        headers: authHeaders(session.accessToken),
        payload: {
          pushToken: makeSimulatorPushToken(`${label.replace(/\s+/g, "-").toLowerCase()}-token`),
          platform: "android",
          label,
        },
      });
      expect(response.statusCode).toBe(200);
    }
    expect(await harness.db.device.count({ where: { active: true } })).toBe(2);

    // 3. Post a signed alarm webhook
    const payload = alarmPayload({ recipientUserIds: [manager.id] });
    const first = await postWebhook(harness, payload);
    expect(first.statusCode).toBe(200);
    const alarmId = first.json().data.alarmId;

    // 4-5. Exactly one alarm and one recipient row
    expect(await harness.db.alarm.count()).toBe(1);
    expect(await harness.db.alarmRecipient.count()).toBe(1);

    // 6. One dispatch covering both devices (delivery rows are P2's concern)
    expect(harness.dispatcher.calls).toEqual([{ alarmId, requestId: expect.any(String) }]);

    // 7-9. Replaying the exact event creates nothing and dispatches nothing
    const replay = await postWebhook(harness, payload);
    expect(replay.json().data.duplicate).toBe(true);
    expect(await harness.db.alarm.count()).toBe(1);
    expect(harness.dispatcher.calls).toHaveLength(1);

    // 10. Unread count is 1
    const unreadBefore = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms/unread-count",
      headers: authHeaders(session.accessToken),
    });
    expect(unreadBefore.json().data.unreadCount).toBe(1);

    // 11. Mark read
    const read = await harness.app.inject({
      method: "POST",
      url: `/v1/alarms/${alarmId}/read`,
      headers: authHeaders(session.accessToken),
    });
    expect(read.statusCode).toBe(200);

    // 12. Unread count is 0
    const unreadAfter = await harness.app.inject({
      method: "GET",
      url: "/v1/alarms/unread-count",
      headers: authHeaders(session.accessToken),
    });
    expect(unreadAfter.json().data.unreadCount).toBe(0);
  });
});
