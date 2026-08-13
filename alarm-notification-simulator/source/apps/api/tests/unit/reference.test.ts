import { describe, expect, test } from "vitest";
import {
  ALARM_DEVICE_KEY_MAX_LENGTH,
  ALARM_REFERENCE_FALLBACK_DEVICE_KEY,
  alarmDateKey,
  composeAlarmReference,
  formatAlarmLabel,
  formatAlarmSequence,
  normaliseDeviceKey,
  parseAlarmReference,
} from "@alarm/contracts";

describe("device key", () => {
  test("removes the hyphen from a source device id", () => {
    // The requested rule: TANK-01 -> TANK01.
    expect(normaliseDeviceKey("TANK-01")).toBe("TANK01");
    expect(normaliseDeviceKey("ROOM-R12")).toBe("ROOMR12");
    expect(normaliseDeviceKey("PUMP-03")).toBe("PUMP03");
  });

  /**
   * The hyphen is the code's own field separator. Leaving it in would produce
   * `TANK-01-20260813-01`, which has four segments and cannot be read back
   * apart - the device would become unrecoverable from its own code.
   */
  test("a kept hyphen would make the code unparseable, so it cannot survive", () => {
    const reference = composeAlarmReference({
      deviceKey: normaliseDeviceKey("TANK-01"),
      dateKey: "20260813",
      sequence: 1,
    });

    expect(parseAlarmReference(reference)).toEqual({
      deviceKey: "TANK01",
      dateKey: "20260813",
      sequence: 1,
    });
  });

  test("uppercases and drops separators, whitespace and punctuation", () => {
    expect(normaliseDeviceKey("tank_01")).toBe("TANK01");
    expect(normaliseDeviceKey("  pump 03 ")).toBe("PUMP03");
    expect(normaliseDeviceKey("chiller.a/2")).toBe("CHILLERA2");
  });

  /**
   * Stripping to ASCII would collapse every CJK-named device onto the fallback
   * key, so a customer naming devices 水槽一 and 水槽二 would find both alarms
   * numbered as if they came from one device.
   */
  test("keeps non-Latin letters instead of collapsing them to the fallback", () => {
    expect(normaliseDeviceKey("水槽-01")).toBe("水槽01");
    expect(normaliseDeviceKey("水槽一")).not.toBe(ALARM_REFERENCE_FALLBACK_DEVICE_KEY);
    expect(normaliseDeviceKey("水槽一")).not.toBe(normaliseDeviceKey("水槽二"));
  });

  test("falls back rather than producing an empty first segment", () => {
    expect(normaliseDeviceKey("---")).toBe(ALARM_REFERENCE_FALLBACK_DEVICE_KEY);
    expect(normaliseDeviceKey("")).toBe(ALARM_REFERENCE_FALLBACK_DEVICE_KEY);
    expect(normaliseDeviceKey(null)).toBe(ALARM_REFERENCE_FALLBACK_DEVICE_KEY);
    expect(normaliseDeviceKey(undefined)).toBe(ALARM_REFERENCE_FALLBACK_DEVICE_KEY);
  });

  /**
   * THE TRAP THIS CATCHES: a fallback key containing characters the parser
   * rejects. `SYS_Manual_Test` has underscores, so a parser admitting only
   * letters and digits would refuse to read back the code of every device-less
   * alarm - and the failure would be silent, because composing still works.
   */
  test("the fallback key produces a code that parses back", () => {
    expect(ALARM_REFERENCE_FALLBACK_DEVICE_KEY).toBe("SYS_Manual_Test");

    const reference = composeAlarmReference({
      deviceKey: ALARM_REFERENCE_FALLBACK_DEVICE_KEY,
      dateKey: "20260813",
      sequence: 2,
    });

    expect(reference).toBe("SYS_Manual_Test-20260813-02");
    expect(parseAlarmReference(reference)).toEqual({
      deviceKey: "SYS_Manual_Test",
      dateKey: "20260813",
      sequence: 2,
    });
  });

  /**
   * The fallback is deliberately shaped like nothing normaliseDeviceKey can
   * emit (it uppercases and strips underscores), so a reader can tell "no device
   * was named" from "a device called SYS". A collision would put a real device's
   * alarms and the manual tests on one counter.
   */
  test("no real device id can normalise into the fallback key", () => {
    for (const candidate of ["SYS_Manual_Test", "sys-manual-test", "SYS Manual Test"]) {
      expect(normaliseDeviceKey(candidate)).not.toBe(ALARM_REFERENCE_FALLBACK_DEVICE_KEY);
    }
    expect(normaliseDeviceKey("SYS_Manual_Test")).toBe("SYSMANUALTEST");
  });

  test("truncates a pathological id to keep the code quotable", () => {
    const key = normaliseDeviceKey("D".repeat(200));
    expect(key).toHaveLength(ALARM_DEVICE_KEY_MAX_LENGTH);
    // Still parseable, which is what truncation must not break.
    expect(parseAlarmReference(`${key}-20260813-01`)?.deviceKey).toBe(key);
  });
});

describe("sequence formatting", () => {
  /** The requested widths: pad to two, then grow rather than wrap or stall. */
  test("pads to two digits and then grows", () => {
    expect(formatAlarmSequence(1)).toBe("01");
    expect(formatAlarmSequence(9)).toBe("09");
    expect(formatAlarmSequence(99)).toBe("99");
    expect(formatAlarmSequence(100)).toBe("100");
    expect(formatAlarmSequence(199)).toBe("199");
    expect(formatAlarmSequence(1001)).toBe("1001");
  });

  /**
   * Zero or a negative value means the counter was read before it was
   * incremented. Formatting it would mint a code no allocation ever issued.
   */
  test("refuses a sequence that cannot have been allocated", () => {
    expect(() => formatAlarmSequence(0)).toThrow();
    expect(() => formatAlarmSequence(-1)).toThrow();
    expect(() => formatAlarmSequence(1.5)).toThrow();
  });
});

describe("date key", () => {
  test("is the calendar date in the given zone, as YYYYMMDD", () => {
    const at = new Date("2026-08-13T07:04:12.000Z");
    expect(alarmDateKey(at, "Asia/Taipei")).toBe("20260813");
    expect(alarmDateKey(at, "UTC")).toBe("20260813");
  });

  /**
   * THE reason the zone is system-wide rather than per handset. This instant is
   * two different calendar days in Taipei and in London, so a per-reader zone
   * would give one alarm two names and make it undiscussable.
   */
  test("the same instant is a different day in different zones", () => {
    const lateEvening = new Date("2026-08-13T16:30:00.000Z"); // 00:30 next day in Taipei
    expect(alarmDateKey(lateEvening, "Asia/Taipei")).toBe("20260814");
    expect(alarmDateKey(lateEvening, "Europe/London")).toBe("20260813");
  });

  test("crossing local midnight changes the key, which is what resets counters", () => {
    const before = new Date("2026-08-13T15:59:59.000Z"); // 23:59:59 Taipei
    const after = new Date("2026-08-13T16:00:01.000Z"); // 00:00:01 Taipei

    expect(alarmDateKey(before, "Asia/Taipei")).toBe("20260813");
    expect(alarmDateKey(after, "Asia/Taipei")).toBe("20260814");
  });

  test("falls back to the host zone rather than throwing on a bad zone", () => {
    // Config validation catches typos at startup; this must never drop an alarm.
    const at = new Date("2026-08-13T07:04:12.000Z");
    expect(() => alarmDateKey(at, "Not/AZone")).not.toThrow();
    expect(alarmDateKey(at, "Not/AZone")).toMatch(/^\d{8}$/);
    expect(alarmDateKey(at, null)).toMatch(/^\d{8}$/);
  });
});

describe("reference codes", () => {
  test("compose in the requested shape", () => {
    expect(
      composeAlarmReference({ deviceKey: "TANK01", dateKey: "20260811", sequence: 99 }),
    ).toBe("TANK01-20260811-99");
    expect(
      composeAlarmReference({ deviceKey: "TANK02", dateKey: "20260813", sequence: 1001 }),
    ).toBe("TANK02-20260813-1001");
  });

  test("round-trip through parse", () => {
    for (const sequence of [1, 9, 99, 100, 1001]) {
      const parts = { deviceKey: "ROOMR12", dateKey: "20260813", sequence };
      expect(parseAlarmReference(composeAlarmReference(parts))).toEqual(parts);
    }
  });

  test("rejects malformed codes instead of half-reading them", () => {
    // Underscores are admitted (the fallback key needs them); hyphens are not.
    expect(parseAlarmReference("SYS_Manual_Test-20260813-02")).not.toBeNull();
    expect(parseAlarmReference("TANK01-20260813")).toBeNull();
    expect(parseAlarmReference("TANK-01-20260813-01")).toBeNull();
    expect(parseAlarmReference("TANK01-2026813-01")).toBeNull();
    expect(parseAlarmReference("TANK01-20260813-00")).toBeNull();
    expect(parseAlarmReference("")).toBeNull();
  });
});

describe("alarm label", () => {
  test("appends the code to the title", () => {
    expect(formatAlarmLabel("水溫 紅燈告警", "TANK01-20260811-99")).toBe(
      "水溫 紅燈告警 (TANK01-20260811-99)",
    );
  });

  /**
   * Alarms predating the scheme have no code. Rendering `(null)` or inventing a
   * number would put a quotable string into an audit trail that matches nothing.
   */
  test("renders the bare title when there is no code", () => {
    expect(formatAlarmLabel("水溫 紅燈告警", null)).toBe("水溫 紅燈告警");
    expect(formatAlarmLabel("水溫 紅燈告警")).toBe("水溫 紅燈告警");
    expect(formatAlarmLabel("水溫 紅燈告警", "")).toBe("水溫 紅燈告警");
  });
});
