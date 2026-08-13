import crypto from "node:crypto";
import { config } from "./config.js";

export const SIGNATURE_HEADER = "x-internal-webhook-signature";
export const SOURCE_FORMAT_HEADER = "x-source-format";

/**
 * How the outgoing webhook should be signed.
 *
 * The invalid and missing modes exist to demonstrate that the notification
 * API's HMAC check actually rejects traffic - a security control nobody has
 * watched fail is a security control nobody should trust.
 */
export type SignatureMode = "valid" | "invalid" | "missing";

export type WebhookDispatch = {
  url: string;
  format: string;
  signatureMode: SignatureMode;
  requestBody: string;
  /** Signature actually sent, truncated. Never the secret itself. */
  signaturePreview: string | null;
  status: number | null;
  responseBody: unknown;
  transportError: string | null;
  durationMs: number;
};

function signatureFor(mode: SignatureMode, rawBody: string): string | null {
  switch (mode) {
    case "valid":
      // Computed over the exact bytes transmitted. Signing a re-serialised
      // object here would produce a mismatch the receiver cannot diagnose.
      return crypto.createHmac("sha256", config.INTERNAL_WEBHOOK_SECRET).update(rawBody).digest("hex");
    case "invalid":
      return crypto.randomBytes(32).toString("hex");
    case "missing":
      return null;
  }
}

export async function postWebhook(options: {
  payload: unknown;
  format: string;
  signatureMode: SignatureMode;
}): Promise<WebhookDispatch> {
  const url = `${config.NOTIFICATION_API_BASE_URL}/v1/internal/alarms`;
  // Serialise ONCE and sign those exact bytes. Serialising separately for the
  // signature and the body is the classic way to break HMAC verification.
  const requestBody = JSON.stringify(options.payload);
  const signature = signatureFor(options.signatureMode, requestBody);

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature) headers[SIGNATURE_HEADER] = signature;
  if (options.format !== "standard") headers[SOURCE_FORMAT_HEADER] = options.format;

  const startedAt = Date.now();

  try {
    const response = await fetch(url, { method: "POST", headers, body: requestBody });
    const text = await response.text();

    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Leave the raw text: a non-JSON body is itself diagnostic information.
    }

    return {
      url,
      format: options.format,
      signatureMode: options.signatureMode,
      requestBody,
      signaturePreview: signature ? `${signature.slice(0, 12)}...` : null,
      status: response.status,
      responseBody: parsed,
      transportError: null,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      url,
      format: options.format,
      signatureMode: options.signatureMode,
      requestBody,
      signaturePreview: signature ? `${signature.slice(0, 12)}...` : null,
      status: null,
      responseBody: null,
      transportError: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    };
  }
}
