import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { coerceDeviceId, parseAlarmReference } from "@alarm/contracts";
import { ingestAlarmEvent } from "../../src/alarms/ingest.js";
import { allocateAlarmReference, deviceKeyForAlarm } from "../../src/alarms/reference.js";
import { config } from "../../src/config.js";
import type { Db } from "../../src/db/prisma.js";
import { serverEvents } from "../../src/events/bus.js";
import { sensorThresholdV1Adapter } from "../../src/webhooks/adapters/sensor-threshold-v1.js";
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

/** A row from the customer's threshold table. */
function sensorRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    deviceId: "TANK-01",
    metric: "water_temperature",
    metricLabel: "水溫",
    value: 55,
    unit: "°C",
    level: "RED",
    threshold: 50,
    message: "TANK-01 水溫 55°C，已超過紅燈門檻 50°C。",
    createdAt: "2026-08-13T02:00:00.000Z",
    ...overrides,
  };
}

async function ingestRow(overrides: Record<string, unknown> = {}, recipients: string[] = []) {
  const event = sensorThresholdV1Adapter.normalise(sensorRow(overrides));
  return ingestAlarmEvent(db, {
    event: { ...event, recipientUserIds: recipients },
    payloadHash: `hash-${String(overrides.id ?? 1)}-${String(overrides.createdAt ?? "")}`,
    requestId: `req-${String(overrides.id ?? 1)}`,
  });
}

describe("allocation", () => {
  test("numbers each device independently, both starting at 01", async () => {
    const tank = await allocateAlarmReference(db, {
      deviceId: "TANK-01",
      occurredAt: new Date("2026-08-13T02:00:00.000Z"),
    });
    const room = await allocateAlarmReference(db, {
      deviceId: "ROOM-R12",
      occurredAt: new Date("2026-08-13T02:00:00.000Z"),
    });

    // TANK-01's third alarm is not affected by anything ROOM-R12 did.
    expect(tank.reference).toBe("TANK01-20260813-01");
    expect(room.reference).toBe("ROOMR12-20260813-01");
  });

  test("increments per device and pads then grows", async () => {
    const at = new Date("2026-08-13T02:00:00.000Z");
    const issued: string[] = [];

    for (let index = 0; index < 3; index += 1) {
      const result = await allocateAlarmReference(db, {
        deviceId: "TANK-01",
        occurredAt: at,
      });
      issued.push(result.reference);
    }

    expect(issued).toEqual([
      "TANK01-20260813-01",
      "TANK01-20260813-02",
      "TANK01-20260813-03",
    ]);

    // Jump the counter to prove the width grows rather than wrapping at 99.
    await db.alarmSequence.update({
      where: { deviceKey_dateKey: { deviceKey: "TANK01", dateKey: "20260813" } },
      data: { lastSeq: 99 },
    });

    const hundredth = await allocateAlarmReference(db, {
      deviceId: "TANK-01",
      occurredAt: at,
    });
    expect(hundredth.reference).toBe("TANK01-20260813-100");
  });

  /**
   * The daily reset, which is the whole reason the counter is keyed by date.
   * Nothing runs at midnight - the new date simply has no row yet.
   */
  test("restarts at 01 on the next local day, with no scheduled job", async () => {
    const beforeMidnight = new Date("2026-08-13T15:59:00.000Z"); // 23:59 Taipei
    const afterMidnight = new Date("2026-08-13T16:01:00.000Z"); // 00:01 Taipei

    const last = await allocateAlarmReference(db, {
      deviceId: "TANK-01",
      occurredAt: beforeMidnight,
    });
    const second = await allocateAlarmReference(db, {
      deviceId: "TANK-01",
      occurredAt: beforeMidnight,
    });
    const first = await allocateAlarmReference(db, {
      deviceId: "TANK-01",
      occurredAt: afterMidnight,
    });

    expect(last.reference).toBe("TANK01-20260813-01");
    expect(second.reference).toBe("TANK01-20260813-02");
    expect(first.reference).toBe("TANK01-20260814-01");

    // Yesterday's counter is untouched and still available to continue.
    const late = await allocateAlarmReference(db, {
      deviceId: "TANK-01",
      occurredAt: beforeMidnight,
    });
    expect(late.reference).toBe("TANK01-20260813-03");
  });

  /**
   * The date comes from occurredAt, not from the clock. A row that reaches us
   * after midnight for a condition that happened before it belongs to the day it
   * happened - the code names when the tank overheated, not when we noticed.
   */
  test("files a late arrival under the day it occurred", async () => {
    const occurred = new Date("2026-08-13T15:58:00.000Z"); // 23:58 Taipei
    const result = await allocateAlarmReference(db, {
      deviceId: "TANK-01",
      occurredAt: occurred,
    });

    expect(parseAlarmReference(result.reference)?.dateKey).toBe("20260813");
  });

  /**
   * A device-less alarm is numbered under a key that cannot be mistaken for
   * equipment. This used to derive the key from the source name, producing
   * `OPERATIONSSERVER-20260813-01` - long, and it invited the reader to go
   * looking for a device called "OPERATIONSSERVER".
   */
  test("uses SYS_Manual_Test when the alarm names no device", async () => {
    const result = await allocateAlarmReference(db, {
      deviceId: null,
      occurredAt: new Date("2026-08-13T02:00:00.000Z"),
    });

    expect(result.reference).toBe("SYS_Manual_Test-20260813-01");
    // Still parseable - the underscores must not break the reader.
    expect(parseAlarmReference(result.reference)?.deviceKey).toBe("SYS_Manual_Test");
  });

  test("device-less alarms share one counter, separate from every device", async () => {
    const at = new Date("2026-08-13T02:00:00.000Z");
    const first = await allocateAlarmReference(db, { deviceId: null, occurredAt: at });
    const tank = await allocateAlarmReference(db, {
      deviceId: "TANK-01",
      occurredAt: at,
    });
    const second = await allocateAlarmReference(db, { deviceId: null, occurredAt: at });

    expect(first.reference).toBe("SYS_Manual_Test-20260813-01");
    expect(second.reference).toBe("SYS_Manual_Test-20260813-02");
    // The manual tests did not advance TANK-01's own numbering.
    expect(tank.reference).toBe("TANK01-20260813-01");
  });

  test("an empty or blank deviceId is treated as no device, not as a key", async () => {
    const at = new Date("2026-08-13T02:00:00.000Z");
    for (const deviceId of ["", "   ", "---"]) {
      const result = await allocateAlarmReference(db, { deviceId, occurredAt: at });
      expect(result.parts.deviceKey).toBe("SYS_Manual_Test");
    }
  });

  /**
   * Numeric asset ids are extremely common in operations systems. Rejecting
   * them would send every alarm from such a source to the device-less fallback
   * - all sharing one counter, every real incident labelled a manual test, and
   * nothing logged, because the codes would still be perfectly well-formed.
   */
  test("accepts a numeric asset id rather than treating it as no device", () => {
    expect(deviceKeyForAlarm(coerceDeviceId(12345))).toBe("12345");
    expect(deviceKeyForAlarm(coerceDeviceId(0))).toBe("0");
    // Not an identifier by any reading - fall back deliberately instead of
    // stringifying it into "[object Object]" or "NaN".
    expect(deviceKeyForAlarm(coerceDeviceId({}))).toBe("SYS_Manual_Test");
    expect(deviceKeyForAlarm(coerceDeviceId(Number.NaN))).toBe("SYS_Manual_Test");
    expect(deviceKeyForAlarm(coerceDeviceId(null))).toBe("SYS_Manual_Test");
  });

  test("uses the configured timezone, not UTC", () => {
    // Guards the default: if this ever became UTC, every code between 08:00 and
    // midnight Taipei would silently carry the previous day's date.
    expect(config.ALARM_REFERENCE_TIMEZONE).toBe("Asia/Taipei");
  });
});

describe("ingestion", () => {
  test("stores the code on the alarm and reports it back", async () => {
    const result = await ingestRow();
    const alarm = await db.alarm.findUniqueOrThrow({ where: { id: result.alarmId } });

    expect(alarm.reference).toBe("TANK01-20260813-01");
    expect(result.reference).toBe("TANK01-20260813-01");
    // The device is no longer duplicated into the title - the code carries it.
    expect(alarm.title).toBe("水溫 紅燈告警");
  });

  test("names the alarm in the alarm_created event", async () => {
    const seen: string[] = [];
    const unsubscribe = serverEvents.subscribe((event) => {
      if (event.event === "alarm_created") seen.push(event.message);
    });

    try {
      await ingestRow();
    } finally {
      unsubscribe();
    }

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe("[CRITICAL] 水溫 紅燈告警 (TANK01-20260813-01)");
  });

  /**
   * A flapping sensor must not be able to consume its device's daily sequence.
   * If duplicates took numbers, a sensor oscillating around the threshold would
   * reach TANK01-…-40 by dawn having raised one real alarm, and the count would
   * imply forty incidents.
   */
  test("a suppressed duplicate consumes no number", async () => {
    const first = await ingestRow({ id: 10 });
    // Same row id AND same timestamp: the same event, delivered twice.
    const retry = await ingestRow({ id: 10 });

    expect(first.duplicate).toBe(false);
    expect(retry.duplicate).toBe(true);
    // The retry reports the code of the alarm that already holds the event.
    expect(retry.reference).toBe(first.reference);

    const counter = await db.alarmSequence.findUniqueOrThrow({
      where: { deviceKey_dateKey: { deviceKey: "TANK01", dateKey: "20260813" } },
    });
    expect(counter.lastSeq).toBe(1);
  });

  test("a dedupKey hit consumes no number either", async () => {
    // Different row ids inside the same 5-minute bucket at the same level: two
    // events that mean one thing.
    const first = await ingestRow({ id: 20, createdAt: "2026-08-13T02:00:00.000Z" });
    const second = await ingestRow({ id: 21, createdAt: "2026-08-13T02:01:00.000Z" });

    expect(second.duplicate).toBe(true);
    expect(second.duplicateReason).toBe("dedup_key");
    expect(second.reference).toBe(first.reference);

    const counter = await db.alarmSequence.findUniqueOrThrow({
      where: { deviceKey_dateKey: { deviceKey: "TANK01", dateKey: "20260813" } },
    });
    expect(counter.lastSeq).toBe(1);
  });

  test("an escalation from yellow to red takes the next number", async () => {
    const yellow = await ingestRow({ id: 30, level: "YELLOW", value: 35, threshold: 30 });
    const red = await ingestRow({ id: 31, level: "RED", value: 55 });

    // Not a duplicate: the level is part of the dedup key on purpose.
    expect(red.duplicate).toBe(false);
    expect(yellow.reference).toBe("TANK01-20260813-01");
    expect(red.reference).toBe("TANK01-20260813-02");
  });

  test("two devices breaching at once do not share a sequence", async () => {
    const tank = await ingestRow({ id: 40, deviceId: "TANK-01" });
    const room = await ingestRow({
      id: 41,
      deviceId: "ROOM-R12",
      metric: "room_temperature",
      metricLabel: "機房溫度",
    });

    expect(tank.reference).toBe("TANK01-20260813-01");
    expect(room.reference).toBe("ROOMR12-20260813-01");
  });

  /**
   * The codes are what a person quotes, so two alarms answering to one code
   * would make a handover ambiguous. The unique index is the guarantee.
   */
  test("the code is unique across alarms", async () => {
    await ingestRow({ id: 50 });
    await ingestRow({ id: 51, level: "YELLOW", value: 35, threshold: 30 });
    await ingestRow({ id: 52, deviceId: "PUMP-03", metric: "pressure", metricLabel: "水壓" });

    const alarms = await db.alarm.findMany({ select: { reference: true } });
    const references = alarms.map((alarm) => alarm.reference);

    expect(references).toHaveLength(3);
    expect(new Set(references).size).toBe(3);
    for (const reference of references) {
      expect(parseAlarmReference(reference ?? "")).not.toBeNull();
    }
  });
});
