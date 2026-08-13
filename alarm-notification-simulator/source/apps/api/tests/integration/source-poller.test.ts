import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { formatAlarmLabel, makeSimulatorPushToken } from "@alarm/contracts";
import { hashPassword } from "../../src/auth/password.js";
import type { Db } from "../../src/db/prisma.js";
import { SourceEventPoller } from "../../src/ingest/source-poller.js";
import type { SourceEventReader } from "../../src/ingest/source-reader.js";
import type { PushDispatcher } from "../../src/notifications/dispatcher.js";
import { createTestDatabase } from "../helpers/db.js";
import type { TestDatabase } from "../helpers/db.js";

/** A reader we control, standing in for the customer's threshold table. */
class FakeReader implements SourceEventReader {
  readonly name = "fake";
  pending: unknown[] = [];
  calls = 0;
  failNext = false;

  async fetchPending(): Promise<unknown[]> {
    this.calls += 1;
    if (this.failNext) {
      this.failNext = false;
      throw new Error("customer database unreachable");
    }
    const batch = this.pending;
    this.pending = [];
    return batch;
  }
}

class RecordingDispatcher implements PushDispatcher {
  readonly calls: string[] = [];
  async sendForAlarm(alarmId: string): Promise<void> {
    this.calls.push(alarmId);
  }
}

let database: TestDatabase;
let db: Db;
let reader: FakeReader;
let dispatcher: RecordingDispatcher;
let poller: SourceEventPoller;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    deviceId: "TANK-01",
    metric: "water_temperature",
    metricLabel: "水溫",
    value: 55,
    unit: "°C",
    level: "RED",
    threshold: 50,
    message: "TANK-01 水溫 55°C，已超過紅燈門檻 50°C，須立即處理。",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

async function makeUser(email: string, active = true) {
  return db.user.create({
    data: { email, passwordHash: await hashPassword("poller-test-pw"), active },
  });
}

beforeEach(async () => {
  database = await createTestDatabase();
  db = database.db;
  reader = new FakeReader();
  dispatcher = new RecordingDispatcher();
  poller = new SourceEventPoller(db, reader, { intervalMs: 60_000 }, dispatcher);
});

afterEach(async () => {
  poller.stop();
  await database.destroy();
});

describe("threshold row ingestion", () => {
  test("a red-light row becomes a CRITICAL alarm for every active account", async () => {
    const manager = await makeUser("poll-mgr@test.local");
    const vendor = await makeUser("poll-vendor@test.local");

    reader.pending = [row()];
    const summary = await poller.pollOnce();

    expect(summary).toMatchObject({ fetched: 1, created: 1, duplicates: 0, failed: 0 });

    const alarm = await db.alarm.findFirstOrThrow();
    expect(alarm.severity).toBe("CRITICAL");
    expect(alarm.source).toBe("customer-threshold-db");
    // The row's identity carries both its primary key and its creation time, so
    // a reset id space cannot collide with a row ingested long ago.
    expect(alarm.sourceEventId).toMatch(/^row-1-\d+$/);

    // The customer's table knows nothing about our users, so recipients come
    // from our policy - which for v1 is every active account.
    const recipients = await db.alarmRecipient.findMany();
    expect(recipients.map((entry) => entry.userId).sort()).toEqual([manager.id, vendor.id].sort());
    expect(dispatcher.calls).toHaveLength(1);
  });

  test("a yellow-light row becomes a WARNING", async () => {
    await makeUser("poll-yellow@test.local");

    reader.pending = [row({ id: 2, level: "YELLOW", value: 35, threshold: 30 })];
    await poller.pollOnce();

    const alarm = await db.alarm.findFirstOrThrow();
    expect(alarm.severity).toBe("WARNING");
  });

  test("inactive accounts are not notified", async () => {
    const active = await makeUser("poll-active@test.local");
    await makeUser("poll-inactive@test.local", false);

    reader.pending = [row()];
    await poller.pollOnce();

    const recipients = await db.alarmRecipient.findMany();
    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.userId).toBe(active.id);
  });

  test("the measured value and threshold survive into the alarm details", async () => {
    await makeUser("poll-details@test.local");

    reader.pending = [row({ value: 91.5 })];
    await poller.pollOnce();

    const alarm = await db.alarm.findFirstOrThrow();
    // Without the reading itself there is no way to tell 50 degrees from 90.
    expect(JSON.parse(alarm.details)).toMatchObject({
      value: 91.5,
      threshold: 50,
      level: "RED",
      deviceId: "TANK-01",
      sourceRowId: 1,
    });
  });
});

describe("re-reading the same row", () => {
  test("the same row id twice creates one alarm and one dispatch", async () => {
    await makeUser("poll-dup@test.local");

    reader.pending = [row({ id: 7 })];
    await poller.pollOnce();
    // A crash between read and mark, or a poller restart, re-delivers the row.
    reader.pending = [row({ id: 7 })];
    const second = await poller.pollOnce();

    expect(second.duplicates).toBe(1);
    expect(second.created).toBe(0);
    expect(await db.alarm.count()).toBe(1);
    expect(dispatcher.calls).toHaveLength(1);
  });

  test("the same row delivered twice inside one batch is still one alarm", async () => {
    await makeUser("poll-batch@test.local");

    reader.pending = [row({ id: 8 }), row({ id: 8 })];
    const summary = await poller.pollOnce();

    expect(summary.created).toBe(1);
    expect(summary.duplicates).toBe(1);
    expect(await db.alarm.count()).toBe(1);
  });
});

describe("deduplication of repeated readings", () => {
  test("a chattering sensor at the same level collapses into one alarm", async () => {
    await makeUser("poll-flap@test.local");

    // Distinct row ids - a real table would assign one per reading - but the
    // same device, metric and light inside one 5-minute bucket.
    reader.pending = [
      row({ id: 11, value: 55 }),
      row({ id: 12, value: 56 }),
      row({ id: 13, value: 57 }),
    ];
    const summary = await poller.pollOnce();

    expect(summary.created).toBe(1);
    expect(summary.duplicates).toBe(2);
    // One phone buzz, not three.
    expect(dispatcher.calls).toHaveLength(1);
  });

  test("an escalation from yellow to red is NOT suppressed", async () => {
    await makeUser("poll-escalate@test.local");

    reader.pending = [
      row({ id: 21, level: "YELLOW", value: 35, threshold: 30 }),
      row({ id: 22, level: "RED", value: 55, threshold: 50 }),
    ];
    const summary = await poller.pollOnce();

    /**
     * The level is part of the deduplication key precisely so this cannot be
     * swallowed. Suppressing the red because a yellow already fired in the same
     * five-minute window would hide the alarm that actually matters.
     */
    expect(summary.created).toBe(2);
    expect(dispatcher.calls).toHaveLength(2);

    const severities = (await db.alarm.findMany()).map((alarm) => alarm.severity).sort();
    expect(severities).toEqual(["CRITICAL", "WARNING"]);
  });
});

describe("resilience", () => {
  test("an unreadable source is reported and does not throw", async () => {
    await makeUser("poll-down@test.local");
    reader.failNext = true;

    const summary = await poller.pollOnce();

    expect(summary.failed).toBe(1);
    expect(summary.created).toBe(0);
    expect(await db.alarm.count()).toBe(0);
  });

  test("a malformed row is skipped without losing the rest of the batch", async () => {
    await makeUser("poll-bad@test.local");

    reader.pending = [
      { id: 31, level: "PURPLE" }, // unmapped light, missing fields
      row({ id: 32 }),
    ];
    const summary = await poller.pollOnce();

    expect(summary.failed).toBe(1);
    expect(summary.created).toBe(1);
    // One bad row from the customer's table must not silence the good ones.
    expect(await db.alarm.count()).toBe(1);
  });

  test("an empty table costs nothing", async () => {
    const summary = await poller.pollOnce();
    expect(summary).toMatchObject({ fetched: 0, created: 0, duplicates: 0, failed: 0 });
    expect(await db.alarm.count()).toBe(0);
  });

  test("a row with no active accounts is still stored", async () => {
    reader.pending = [row({ id: 41 })];
    const summary = await poller.pollOnce();

    expect(summary.created).toBe(1);
    // Discarding it would destroy the only evidence the condition ever fired.
    expect(await db.alarm.count()).toBe(1);
    expect(await db.alarmRecipient.count()).toBe(0);
    expect(dispatcher.calls).toHaveLength(1);
  });

  test("overlapping polls do not double-read", async () => {
    await makeUser("poll-overlap@test.local");
    reader.pending = [row({ id: 51 })];

    const [first, second] = await Promise.all([poller.pollOnce(), poller.pollOnce()]);

    // The second call finds a run in progress and skips its turn rather than
    // reading the same rows again.
    const totalFetched = first.fetched + second.fetched;
    expect(totalFetched).toBe(1);
    expect(reader.calls).toBe(1);
    expect(await db.alarm.count()).toBe(1);
  });
});

describe("the notified account can act on it", () => {
  test("a polled alarm is visible to the recipient and acknowledgeable", async () => {
    const user = await makeUser("poll-ack@test.local");
    await db.device.create({
      data: {
        userId: user.id,
        pushToken: makeSimulatorPushToken("poll-ack-phone"),
        platform: "SIMULATOR",
        label: "Poll Ack Phone",
      },
    });

    reader.pending = [row({ id: 61 })];
    await poller.pollOnce();

    const alarm = await db.alarm.findFirstOrThrow();
    const recipient = await db.alarmRecipient.findUniqueOrThrow({
      where: { alarmId_userId: { alarmId: alarm.id, userId: user.id } },
    });

    expect(recipient.state).toBe("PENDING");
    expect(alarm.title).toContain("紅燈告警");

    /**
     * The reader must still be able to tell WHICH tank. That used to be checked
     * on the title, which carried `（TANK-01）`; the device now lives in the
     * reference code instead, so the assertion moved rather than being dropped -
     * an alarm that cannot be traced to a device is the original defect this
     * line was written to catch.
     */
    expect(alarm.reference).toMatch(/^TANK01-\d{8}-\d{2,}$/);
    expect(formatAlarmLabel(alarm.title, alarm.reference)).toContain("TANK01");
  });
});
