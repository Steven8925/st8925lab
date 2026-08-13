import { describe, expect, test } from "vitest";
import { sensorThresholdV1Adapter } from "../../src/webhooks/adapters/sensor-threshold-v1.js";

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
    createdAt: "2026-08-12T07:32:00.000Z",
    ...overrides,
  };
}

describe("sensor-threshold-v1 adapter", () => {
  test("maps the yellow light to WARNING and the red light to CRITICAL", () => {
    expect(sensorThresholdV1Adapter.normalise(row({ level: "YELLOW" })).severity).toBe("WARNING");
    expect(sensorThresholdV1Adapter.normalise(row({ level: "RED" })).severity).toBe("CRITICAL");
  });

  test("keeps the reading and threshold in details", () => {
    const result = sensorThresholdV1Adapter.normalise(row({ value: 91.5 }));

    // Without the value itself there is no way to distinguish 50 degrees from 90.
    expect(result.details).toMatchObject({
      value: 91.5,
      threshold: 50,
      level: "RED",
      deviceId: "TANK-01",
      sourceRowId: 1,
    });
  });

  test("carries no recipients - the customer's table does not know our users", () => {
    const result = sensorThresholdV1Adapter.normalise(row());
    expect(result.recipientUserIds).toEqual([]);
    expect(result.recipientEmails).toEqual([]);
  });

  describe("event identity", () => {
    test("is stable for the same row", () => {
      expect(sensorThresholdV1Adapter.normalise(row()).eventId).toBe(
        sensorThresholdV1Adapter.normalise(row()).eventId,
      );
    });

    test("differs when a reset id space reuses a primary key", () => {
      /**
       * A truncated or recreated source table starts again at id 1. A bare
       * `row-1` would collide with an id ingested months earlier and be
       * suppressed as a duplicate - silently losing a real alarm.
       */
      const original = sensorThresholdV1Adapter.normalise(
        row({ id: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
      );
      const afterReset = sensorThresholdV1Adapter.normalise(
        row({ id: 1, createdAt: "2026-08-12T07:32:00.000Z" }),
      );

      expect(afterReset.eventId).not.toBe(original.eventId);
    });
  });

  describe("deduplication key", () => {
    test("collapses repeated readings at the same level in one 5-minute bucket", () => {
      const first = sensorThresholdV1Adapter.normalise(
        row({ id: 1, value: 55, createdAt: "2026-08-12T07:31:10.000Z" }),
      );
      const second = sensorThresholdV1Adapter.normalise(
        row({ id: 2, value: 57, createdAt: "2026-08-12T07:34:50.000Z" }),
      );

      expect(second.dedupKey).toBe(first.dedupKey);
    });

    test("does NOT collapse an escalation from yellow to red", () => {
      const yellow = sensorThresholdV1Adapter.normalise(
        row({ id: 1, level: "YELLOW", value: 35, threshold: 30 }),
      );
      const red = sensorThresholdV1Adapter.normalise(row({ id: 2, level: "RED" }));

      // Suppressing the red because a yellow already fired in the same window
      // would hide the alarm that actually matters.
      expect(red.dedupKey).not.toBe(yellow.dedupKey);
    });

    test("does not collapse different devices reporting the same metric", () => {
      const tankA = sensorThresholdV1Adapter.normalise(row({ deviceId: "TANK-01" }));
      const tankB = sensorThresholdV1Adapter.normalise(row({ deviceId: "TANK-02" }));

      expect(tankA.dedupKey).not.toBe(tankB.dedupKey);
    });

    test("separates readings in different 5-minute buckets", () => {
      const early = sensorThresholdV1Adapter.normalise(
        row({ createdAt: "2026-08-12T07:31:00.000Z" }),
      );
      const later = sensorThresholdV1Adapter.normalise(
        row({ createdAt: "2026-08-12T07:41:00.000Z" }),
      );

      expect(later.dedupKey).not.toBe(early.dedupKey);
    });
  });

  describe("rejection", () => {
    test.each([
      ["an unmapped light", { level: "PURPLE" }],
      ["a missing device", { deviceId: "" }],
      ["a missing message", { message: "" }],
      ["an unparseable timestamp", { createdAt: "not a date" }],
    ])("rejects %s", (_label, invalid) => {
      expect(() => sensorThresholdV1Adapter.normalise(row(invalid))).toThrow();
    });
  });
});
