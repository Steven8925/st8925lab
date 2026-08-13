import { describe, expect, test } from "vitest";
import { resolveAdapter } from "../../src/webhooks/adapters/index.js";
import { legacyOpsV1Adapter } from "../../src/webhooks/adapters/legacy-ops-v1.js";
import { sensorThresholdV1Adapter } from "../../src/webhooks/adapters/sensor-threshold-v1.js";
import { standardAdapter } from "../../src/webhooks/adapters/standard.js";

const UUID = "11111111-2222-4333-8444-555555555555";

describe("adapter resolution", () => {
  test("defaults to the standard adapter when no header is present", () => {
    expect(resolveAdapter(undefined).name).toBe("standard");
    expect(resolveAdapter("").name).toBe("standard");
  });

  test("selects a registered adapter by name", () => {
    expect(resolveAdapter("legacy-ops-v1").name).toBe("legacy-ops-v1");
  });

  test("rejects an unknown format rather than guessing", () => {
    expect(() => resolveAdapter("some-vendor")).toThrowError(/Unknown source format/);
  });
});

describe("standard adapter", () => {
  const payload = {
    eventId: "evt-1",
    source: "operations-server",
    severity: "critical",
    title: "Temperature limit exceeded",
    body: "Server room temperature is above the configured limit.",
    occurredAt: "2026-08-11T10:30:00.000Z",
    dedupKey: "temperature:server-room-1:2026-08-11T10:30",
    recipientUserIds: [UUID],
    details: { value: 42.5, threshold: 35 },
  };

  test("normalises severity to upper case and parses the timestamp", () => {
    const result = standardAdapter.normalise(payload);

    expect(result.severity).toBe("CRITICAL");
    expect(result.occurredAt.toISOString()).toBe("2026-08-11T10:30:00.000Z");
    expect(result.recipientUserIds).toEqual([UUID]);
    expect(result.recipientEmails).toEqual([]);
    expect(result.details).toEqual({ value: 42.5, threshold: 35 });
  });

  test("defaults details to an empty object when omitted", () => {
    const { details, ...withoutDetails } = payload;
    expect(details).toBeDefined();
    expect(standardAdapter.normalise(withoutDetails).details).toEqual({});
  });

  test("treats a missing dedupKey as null rather than inventing one", () => {
    const { dedupKey, ...withoutDedup } = payload;
    expect(dedupKey).toBeDefined();
    expect(standardAdapter.normalise(withoutDedup).dedupKey).toBeNull();
  });

  test.each([
    ["unknown severity", { ...payload, severity: "urgent" }],
    ["empty recipient list", { ...payload, recipientUserIds: [] }],
    ["non-UUID recipient", { ...payload, recipientUserIds: ["not-a-uuid"] }],
    ["non-ISO timestamp", { ...payload, occurredAt: "11/08/2026" }],
    ["missing title", { ...payload, title: "" }],
  ])("rejects %s", (_label, invalid) => {
    expect(() => standardAdapter.normalise(invalid)).toThrow();
  });
});

describe("legacy-ops-v1 adapter", () => {
  const legacy = {
    id: "EVT-9001",
    system: "legacy-ops",
    level: 3,
    subject: "UPS battery fault",
    text: "UPS-2 reported a battery fault.",
    ts: 1786527000,
    notify: ["manager@demo.local"],
    meta: { rack: "R12" },
  };

  test("maps numeric level to severity and email recipients to the email list", () => {
    const result = legacyOpsV1Adapter.normalise(legacy);

    expect(result.severity).toBe("CRITICAL");
    expect(result.eventId).toBe("EVT-9001");
    expect(result.source).toBe("legacy-ops");
    expect(result.recipientUserIds).toEqual([]);
    expect(result.recipientEmails).toEqual(["manager@demo.local"]);
    expect(result.details).toEqual({ rack: "R12" });
  });

  test.each([
    [1, "INFO"],
    [2, "WARNING"],
    [3, "CRITICAL"],
  ])("maps level %i to %s", (level, expected) => {
    expect(legacyOpsV1Adapter.normalise({ ...legacy, level }).severity).toBe(expected);
  });

  test("interprets a 10-digit timestamp as Unix seconds", () => {
    const result = legacyOpsV1Adapter.normalise({ ...legacy, ts: 1786527000 });
    expect(result.occurredAt.toISOString()).toBe(new Date(1786527000 * 1000).toISOString());
  });

  test("interprets a 13-digit timestamp as Unix milliseconds", () => {
    const result = legacyOpsV1Adapter.normalise({ ...legacy, ts: 1786527000123 });
    expect(result.occurredAt.toISOString()).toBe(new Date(1786527000123).toISOString());
  });

  test("accepts an ISO-8601 timestamp string", () => {
    const result = legacyOpsV1Adapter.normalise({ ...legacy, ts: "2026-08-11T10:30:00.000Z" });
    expect(result.occurredAt.toISOString()).toBe("2026-08-11T10:30:00.000Z");
  });

  test("never synthesises a dedupKey from the subject line", () => {
    // Two different alarms can share a subject; a synthesised key would make
    // the second one silently disappear.
    expect(legacyOpsV1Adapter.normalise(legacy).dedupKey).toBeNull();
  });

  test.each([
    ["out-of-range level", { ...legacy, level: 7 }],
    ["no recipients", { ...legacy, notify: [] }],
    ["non-email recipient", { ...legacy, notify: ["not-an-email"] }],
    ["unparseable timestamp", { ...legacy, ts: "not a date" }],
  ])("rejects %s", (_label, invalid) => {
    expect(() => legacyOpsV1Adapter.normalise(invalid)).toThrow();
  });
});

/**
 * F-1: the device that drives the reference code must survive every adapter.
 *
 * These exist because the failure they guard is silent. When `deviceId` was an
 * undeclared convention inside the free-form `details` bag, an adapter that
 * did not happen to populate it produced no error and no log line - but every
 * alarm from that source was numbered `SYS_Manual_Test-…`, all equipment shared
 * one daily counter, and every real incident was labelled a manual test. The
 * codes still looked perfectly well-formed, which is why nobody would notice.
 */
describe("device identity survives every adapter", () => {
  test("sensor-threshold-v1 carries its device through", () => {
    const event = sensorThresholdV1Adapter.normalise({
      id: 1,
      deviceId: "TANK-01",
      metric: "water_temperature",
      metricLabel: "水溫",
      value: 55,
      unit: "°C",
      level: "RED",
      threshold: 50,
      message: "over threshold",
      createdAt: "2026-08-13T02:00:00.000Z",
    });

    expect(event.deviceId).toBe("TANK-01");
  });

  test("the standard format takes the declared top-level field", () => {
    const event = standardAdapter.normalise({
      eventId: "evt-1",
      source: "ops",
      severity: "critical",
      title: "t",
      body: "b",
      occurredAt: "2026-08-13T02:00:00.000Z",
      deviceId: "PUMP-03",
      recipientUserIds: ["11111111-1111-4111-8111-111111111111"],
      details: {},
    });

    expect(event.deviceId).toBe("PUMP-03");
  });

  test("the standard format coerces a numeric asset id", () => {
    const event = standardAdapter.normalise({
      eventId: "evt-2",
      source: "ops",
      severity: "warning",
      title: "t",
      body: "b",
      occurredAt: "2026-08-13T02:00:00.000Z",
      deviceId: 4711,
      recipientUserIds: ["11111111-1111-4111-8111-111111111111"],
      details: {},
    });

    expect(event.deviceId).toBe("4711");
  });

  test("the standard format still honours the older details.deviceId convention", () => {
    // Senders already doing this keep working; the declared field is preferred.
    const event = standardAdapter.normalise({
      eventId: "evt-3",
      source: "ops",
      severity: "info",
      title: "t",
      body: "b",
      occurredAt: "2026-08-13T02:00:00.000Z",
      recipientUserIds: ["11111111-1111-4111-8111-111111111111"],
      details: { deviceId: "CHILLER-9" },
    });

    expect(event.deviceId).toBe("CHILLER-9");
  });

  /**
   * The legacy adapter is the worked example: its source has no `deviceId` at
   * all and buries the equipment name in `meta` under the vendor's own name for
   * it. Mapping that is precisely the work the adapter seam exists to do.
   */
  test("legacy-ops-v1 maps the vendor's own field name onto deviceId", () => {
    const base = {
      id: "legacy-1",
      system: "legacy-ops",
      level: 3,
      subject: "s",
      text: "t",
      ts: 1786605407,
      notify: ["a@test.local"],
    };

    expect(legacyOpsV1Adapter.normalise({ ...base, meta: { device: "UPS-2" } }).deviceId).toBe("UPS-2");
    expect(legacyOpsV1Adapter.normalise({ ...base, meta: { equipment: "GEN-1" } }).deviceId).toBe("GEN-1");
    expect(legacyOpsV1Adapter.normalise({ ...base, meta: { deviceId: 88 } }).deviceId).toBe("88");
  });

  test("an alarm that genuinely names no device reports null, not a guess", () => {
    const event = legacyOpsV1Adapter.normalise({
      id: "legacy-2",
      system: "legacy-ops",
      level: 2,
      subject: "s",
      text: "t",
      ts: 1786605407,
      notify: ["a@test.local"],
      meta: { site: "main-site" },
    });

    // null is the honest answer; the numbering layer decides what to do with it.
    expect(event.deviceId).toBeNull();
  });
});
