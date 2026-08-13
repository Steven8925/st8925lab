import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { hashPassword } from "../../src/auth/password.js";
import type { Db } from "../../src/db/prisma.js";
import { purgeExpiredTestData } from "../../src/maintenance/retention.js";
import { createTestDatabase } from "../helpers/db.js";
import type { TestDatabase } from "../helpers/db.js";

let database: TestDatabase;
let db: Db;

beforeEach(async () => {
  database = await createTestDatabase();
  db = database.db;
});

afterEach(async () => {
  await database.destroy();
});

const NOW = new Date("2026-08-13T12:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

async function makeUser(email: string) {
  return db.user.create({
    data: { email, passwordHash: await hashPassword("test-password-123") },
  });
}

/** An alarm with a full set of children, so cascade behaviour is observable. */
async function makeAlarm(input: { reference: string; createdAt: Date; userId: string }) {
  const alarm = await db.alarm.create({
    data: {
      source: "test",
      sourceEventId: `evt-${input.reference}`,
      dedupKey: `dedup-${input.reference}`,
      severity: "CRITICAL",
      title: "水溫 紅燈告警",
      reference: input.reference,
      body: "over threshold",
      occurredAt: input.createdAt,
      createdAt: input.createdAt,
    },
  });

  await db.alarmRecipient.create({ data: { alarmId: alarm.id, userId: input.userId } });
  await db.alarmRead.create({ data: { alarmId: alarm.id, userId: input.userId } });
  await db.alarmUnresolvedRecipient.create({
    data: { alarmId: alarm.id, identifier: "gone@test.local", reason: "UNKNOWN_USER" },
  });

  return alarm;
}

describe("test-data retention", () => {
  test("deletes alarms older than the window and keeps newer ones", async () => {
    const user = await makeUser("retention@test.local");
    await makeAlarm({ reference: "TANK01-20260809-01", createdAt: daysAgo(4), userId: user.id });
    await makeAlarm({ reference: "TANK01-20260812-01", createdAt: daysAgo(1), userId: user.id });

    const result = await purgeExpiredTestData(db, { retentionDays: 3, now: NOW });

    expect(result.alarms).toBe(1);
    const remaining = await db.alarm.findMany({ select: { reference: true } });
    expect(remaining.map((row) => row.reference)).toEqual(["TANK01-20260812-01"]);
  });

  /**
   * The children must go with the parent. A surviving alarm_recipients row
   * pointing at a deleted alarm would make the ledger unqueryable, and an
   * orphaned read row would keep counting towards somebody's unread badge.
   */
  test("children go with the alarm", async () => {
    const user = await makeUser("cascade@test.local");
    await makeAlarm({ reference: "TANK01-20260809-02", createdAt: daysAgo(5), userId: user.id });

    await purgeExpiredTestData(db, { retentionDays: 3, now: NOW });

    expect(await db.alarmRecipient.count()).toBe(0);
    expect(await db.alarmRead.count()).toBe(0);
    expect(await db.alarmUnresolvedRecipient.count()).toBe(0);
  });

  /**
   * webhook_events has no foreign key to alarms - the column is a plain String -
   * so nothing cascades to it. Without an explicit delete the idempotency table
   * would grow forever while everything else was being trimmed.
   */
  test("sweeps the idempotency table, which does not cascade", async () => {
    await db.webhookEvent.create({
      data: { source: "s", eventId: "old", payloadHash: "h1", receivedAt: daysAgo(9) },
    });
    await db.webhookEvent.create({
      data: { source: "s", eventId: "recent", payloadHash: "h2", receivedAt: daysAgo(1) },
    });

    const result = await purgeExpiredTestData(db, { retentionDays: 3, now: NOW });

    expect(result.webhookEvents).toBe(1);
    const left = await db.webhookEvent.findMany({ select: { eventId: true } });
    expect(left.map((row) => row.eventId)).toEqual(["recent"]);
  });

  /**
   * Deleting a counter would let the next alarm for that device and date restart
   * at 01 and reissue a code a surviving alarm may still hold - a unique
   * violation on a live ingest, to save a few dozen bytes.
   */
  test("never deletes the per-device sequence counters", async () => {
    await db.alarmSequence.create({
      data: { deviceKey: "TANK01", dateKey: "20260801", lastSeq: 12 },
    });

    await purgeExpiredTestData(db, { retentionDays: 3, now: NOW });

    const counter = await db.alarmSequence.findUniqueOrThrow({
      where: { deviceKey_dateKey: { deviceKey: "TANK01", dateKey: "20260801" } },
    });
    expect(counter.lastSeq).toBe(12);
  });

  test("leaves users and their devices alone", async () => {
    const user = await makeUser("keepme@test.local");
    await db.device.create({
      data: {
        userId: user.id,
        pushToken: "SimulatorPushToken[keepme]",
        platform: "SIMULATOR",
        createdAt: daysAgo(30),
      },
    });

    await purgeExpiredTestData(db, { retentionDays: 3, now: NOW });

    // Wiping a manager's registration would silently stop their alarms.
    expect(await db.user.count()).toBe(1);
    expect(await db.device.count()).toBe(1);
  });

  /**
   * A zero must mean "keep everything". The destructive reading of an
   * unconfigured value is the one that must never happen by accident.
   */
  test("retentionDays 0 disables the purge instead of deleting everything", async () => {
    const user = await makeUser("disabled@test.local");
    await makeAlarm({ reference: "TANK01-20260701-01", createdAt: daysAgo(40), userId: user.id });

    const result = await purgeExpiredTestData(db, { retentionDays: 0, now: NOW });

    expect(result.cutoff).toBeNull();
    expect(result.alarms).toBe(0);
    expect(await db.alarm.count()).toBe(1);
  });

  test("an alarm exactly at the boundary is kept, not deleted", async () => {
    const user = await makeUser("boundary@test.local");
    // Exactly 3 days old: inside the window by the `lt` comparison.
    await makeAlarm({ reference: "TANK01-20260810-01", createdAt: daysAgo(3), userId: user.id });

    await purgeExpiredTestData(db, { retentionDays: 3, now: NOW });

    expect(await db.alarm.count()).toBe(1);
  });
});
