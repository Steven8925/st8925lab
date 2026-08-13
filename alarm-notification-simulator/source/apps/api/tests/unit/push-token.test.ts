import { describe, expect, test } from "vitest";
import { isSimulatorPushToken, makeSimulatorPushToken } from "@alarm/contracts";
import { isExpoPushToken, isValidPushToken } from "../../src/notifications/token.js";

describe("makeSimulatorPushToken", () => {
  /**
   * The invariant that matters: the constructor must never be able to produce a
   * value its own validator rejects. Breaking this once cost a debugging cycle
   * where device registration silently 400'd and alarms were accepted for a
   * recipient who could never be reached.
   */
  test.each([
    "simple",
    "with-hyphens",
    "With Spaces",
    "  padded  ",
    "Ops E2E Phone",
    "symbols!@#$%^&*()",
    "unicode-機房-phone",
    "MiXeD CaSe 123",
    "trailing-",
    "-leading",
    "double--hyphen",
    "a".repeat(200),
  ])("produces a valid token from %j", (label) => {
    const token = makeSimulatorPushToken(label);
    expect(isSimulatorPushToken(token)).toBe(true);
    expect(isValidPushToken(token)).toBe(true);
  });

  test("is stable for the same label", () => {
    expect(makeSimulatorPushToken("Ops Phone")).toBe(makeSimulatorPushToken("Ops Phone"));
  });

  test("keeps distinct labels distinct", () => {
    expect(makeSimulatorPushToken("phone-a")).not.toBe(makeSimulatorPushToken("phone-b"));
  });

  test("throws rather than emitting an invalid token when nothing survives slugification", () => {
    // Returning "SimulatorPushToken[]" would be worse: it passes as a string
    // and fails only later, far from the cause.
    expect(() => makeSimulatorPushToken("！！！")).toThrowError(/no usable characters/);
    expect(() => makeSimulatorPushToken("   ")).toThrowError(/no usable characters/);
  });
});

describe("token format validation", () => {
  test.each([
    ["SimulatorPushToken[abc]", true],
    ["SimulatorPushToken[]", false],
    ["SimulatorPushToken[has space]", false],
    ["SimulatorPushToken[abc", false],
    ["ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", false],
    ["", false],
  ])("isSimulatorPushToken(%j) === %s", (token, expected) => {
    expect(isSimulatorPushToken(token)).toBe(expected);
  });

  test.each([
    ["ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", true],
    ["ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]", true],
    ["SimulatorPushToken[abc]", false],
    ["not-a-token", false],
  ])("isExpoPushToken(%j) === %s", (token, expected) => {
    expect(isExpoPushToken(token)).toBe(expected);
  });

  test("accepts both provider formats so a transport switch does not orphan devices", () => {
    expect(isValidPushToken(makeSimulatorPushToken("phone"))).toBe(true);
    expect(isValidPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isValidPushToken("random-string")).toBe(false);
  });
});
