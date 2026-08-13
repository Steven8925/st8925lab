import { describe, expect, test } from "vitest";
import {
  computeWebhookSignature,
  hashPayload,
  verifyWebhookSignature,
} from "../../src/webhooks/signature.js";

const SECRET = "a-test-secret-that-is-at-least-32-characters-long";

describe("webhook signature", () => {
  test("accepts a signature computed over the exact raw bytes", () => {
    const raw = Buffer.from('{"eventId":"e-1","source":"ops"}', "utf8");
    const signature = computeWebhookSignature(raw, SECRET);

    expect(verifyWebhookSignature(raw, signature, SECRET)).toBe(true);
  });

  test("rejects a signature computed over re-serialised JSON", () => {
    // The classic integration failure: the sender transmits these bytes, but
    // the receiver signs JSON.stringify(JSON.parse(body)) and the key order or
    // whitespace differs.
    const transmitted = Buffer.from('{ "b": 2, "a": 1 }', "utf8");
    const reserialised = JSON.stringify(JSON.parse(transmitted.toString("utf8")));

    expect(reserialised).not.toBe(transmitted.toString("utf8"));
    expect(
      verifyWebhookSignature(transmitted, computeWebhookSignature(reserialised, SECRET), SECRET),
    ).toBe(false);
  });

  test("rejects a signature made with a different secret", () => {
    const raw = Buffer.from("payload", "utf8");
    const signature = computeWebhookSignature(raw, "a-different-secret-of-sufficient-length-32");

    expect(verifyWebhookSignature(raw, signature, SECRET)).toBe(false);
  });

  test("rejects a tampered body", () => {
    const original = Buffer.from('{"severity":"info"}', "utf8");
    const signature = computeWebhookSignature(original, SECRET);
    const tampered = Buffer.from('{"severity":"critical"}', "utf8");

    expect(verifyWebhookSignature(tampered, signature, SECRET)).toBe(false);
  });

  test("rejects a missing signature header", () => {
    const raw = Buffer.from("payload", "utf8");
    expect(verifyWebhookSignature(raw, undefined, SECRET)).toBe(false);
  });

  test("rejects a missing body", () => {
    expect(verifyWebhookSignature(undefined, computeWebhookSignature("x", SECRET), SECRET)).toBe(false);
  });

  test.each([
    ["too short", "abc123"],
    ["too long", `${"a".repeat(65)}`],
    ["non-hex characters", "z".repeat(64)],
    ["empty", ""],
  ])("rejects a malformed signature without throwing (%s)", (_label, candidate) => {
    const raw = Buffer.from("payload", "utf8");
    // timingSafeEqual throws on a length mismatch, so the length/charset guard
    // must run first - otherwise a malformed header becomes a 500.
    expect(() => verifyWebhookSignature(raw, candidate, SECRET)).not.toThrow();
    expect(verifyWebhookSignature(raw, candidate, SECRET)).toBe(false);
  });

  test("accepts an upper-case signature and ignores surrounding whitespace", () => {
    const raw = Buffer.from("payload", "utf8");
    const signature = computeWebhookSignature(raw, SECRET);

    expect(verifyWebhookSignature(raw, `  ${signature.toUpperCase()}  `, SECRET)).toBe(true);
  });

  test("rejects an array-valued header (duplicated header attack surface)", () => {
    const raw = Buffer.from("payload", "utf8");
    const signature = computeWebhookSignature(raw, SECRET);

    expect(verifyWebhookSignature(raw, [signature, signature], SECRET)).toBe(false);
  });

  test("payload hash is stable and content-sensitive", () => {
    expect(hashPayload("a")).toBe(hashPayload("a"));
    expect(hashPayload("a")).not.toBe(hashPayload("b"));
    expect(hashPayload("a")).toMatch(/^[0-9a-f]{64}$/);
  });
});
