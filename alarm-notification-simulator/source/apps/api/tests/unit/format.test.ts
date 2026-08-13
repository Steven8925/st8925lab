import { describe, expect, test } from "vitest";
import { buildPushBody, formatTimestampLine } from "../../src/notifications/format.js";

const occurredAt = new Date("2026-08-13T07:04:12.000Z");
const sentAt = new Date("2026-08-13T07:04:17.000Z");

describe("notification timestamp line", () => {
  test("states both the occurred and the sent time", () => {
    const line = formatTimestampLine({ occurredAt, sentAt, timeZone: "Asia/Taipei" });

    expect(line).toContain("發生");
    expect(line).toContain("發送");
    // Taipei is UTC+8: 07:04:12Z is 15:04:12 local.
    expect(line).toContain("15:04:12");
    expect(line).toContain("15:04:17");
  });

  /**
   * The zone is the part most likely to be dropped and the most damaging to
   * omit: without it a reader assumes their own zone and can be hours wrong
   * about whether a tank is boiling now or boiled last night.
   */
  test("always states the zone", () => {
    expect(formatTimestampLine({ occurredAt, sentAt, timeZone: "Asia/Taipei" })).toMatch(/GMT\+8/);
    expect(formatTimestampLine({ occurredAt, sentAt, timeZone: "UTC" })).toMatch(/GMT/);
    expect(formatTimestampLine({ occurredAt, sentAt })).toMatch(/GMT/);
  });

  test("renders in the device's zone when one is known", () => {
    const taipei = formatTimestampLine({ occurredAt, sentAt, timeZone: "Asia/Taipei" });
    const utc = formatTimestampLine({ occurredAt, sentAt, timeZone: "UTC" });

    // Same instant, different wall-clock text - which is exactly why the zone
    // has to be rendered rather than assumed.
    expect(taipei).not.toBe(utc);
    expect(utc).toContain("07:04:12");
  });

  test("falls back to the server zone rather than throwing on a bad timezone", () => {
    // A handset can report anything at registration. Losing precision is
    // acceptable; losing the notification is not.
    expect(() =>
      formatTimestampLine({ occurredAt, sentAt, timeZone: "Not/AZone" }),
    ).not.toThrow();
    expect(formatTimestampLine({ occurredAt, sentAt, timeZone: "Not/AZone" })).toContain("發生");
  });

  test("treats a null timezone as unknown", () => {
    expect(() => formatTimestampLine({ occurredAt, sentAt, timeZone: null })).not.toThrow();
  });

  test("shows the gap between occurrence and send, which is itself diagnostic", () => {
    const late = new Date("2026-08-13T07:09:17.000Z");
    const line = formatTimestampLine({ occurredAt, sentAt: late, timeZone: "Asia/Taipei" });

    // Five minutes of source lag is visible without opening anything.
    expect(line).toContain("15:04:12");
    expect(line).toContain("15:09:17");
  });
});

describe("push body", () => {
  test("keeps the alarm text first and appends the timestamps", () => {
    const body = buildPushBody("TANK-01 水溫 55°C，已超過紅燈門檻 50°C。", {
      occurredAt,
      sentAt,
      timeZone: "Asia/Taipei",
    });

    const lines = body.split("\n");
    expect(lines[0]).toBe("TANK-01 水溫 55°C，已超過紅燈門檻 50°C。");
    expect(lines[1]).toContain("發生");
  });
});
