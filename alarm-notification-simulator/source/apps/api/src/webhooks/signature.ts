import crypto from "node:crypto";

const HEX_64 = /^[0-9a-f]{64}$/;

export function computeWebhookSignature(rawBody: Buffer | string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * Verifies the HMAC over the EXACT bytes received.
 *
 * Signing a re-serialised object instead of the raw body is the single most
 * common cause of "signature mismatch" - JSON.stringify does not guarantee the
 * sender's key order or whitespace (README.md §11 trap 13).
 */
export function verifyWebhookSignature(
  rawBody: Buffer | undefined,
  suppliedSignature: string | string[] | undefined,
  secret: string,
): boolean {
  if (!rawBody) return false;
  if (typeof suppliedSignature !== "string") return false;

  const supplied = suppliedSignature.trim().toLowerCase();
  // Length and charset are checked first: timingSafeEqual throws on a length
  // mismatch, and that throw would itself leak the expected length.
  if (!HEX_64.test(supplied)) return false;

  const expected = computeWebhookSignature(rawBody, secret);

  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}

export function hashPayload(rawBody: Buffer | string): string {
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}
