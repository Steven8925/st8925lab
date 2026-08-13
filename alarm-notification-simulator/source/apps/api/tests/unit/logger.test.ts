import { describe, expect, test } from "vitest";
import { makeSimulatorPushToken } from "@alarm/contracts";
import { tokenFingerprint } from "../../src/logger.js";

describe("tokenFingerprint", () => {
  test("never returns the full token", () => {
    const token = makeSimulatorPushToken("11111111-2222-3333-4444-555555555555");
    const fingerprint = tokenFingerprint(token);

    expect(fingerprint).not.toBe(token);
    expect(fingerprint.length).toBeLessThan(token.length);
    expect(token).not.toContain(fingerprint);
  });

  test("is stable for the same token and differs between tokens", () => {
    const a = makeSimulatorPushToken("device-aaaa");
    const b = makeSimulatorPushToken("device-bbbb");

    expect(tokenFingerprint(a)).toBe(tokenFingerprint(a));
    expect(tokenFingerprint(a)).not.toBe(tokenFingerprint(b));
  });

  test("fully masks a short value rather than revealing most of it", () => {
    expect(tokenFingerprint("short")).toBe("***");
  });
});
