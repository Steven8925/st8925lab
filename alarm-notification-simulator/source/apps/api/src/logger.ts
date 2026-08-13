import { pino } from "pino";
import { config } from "./config.js";

/**
 * Values that must never reach a log line or the admin stream.
 * Push tokens identify a device and are treated as secrets.
 */
const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-internal-webhook-signature']",
  "pushToken",
  "*.pushToken",
  "password",
  "*.password",
  "passwordHash",
  "*.passwordHash",
  "accessToken",
  "refreshToken",
];

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
  transport:
    config.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" } }
      : undefined,
});

/**
 * Push tokens are logged as a short fingerprint so a support engineer can
 * correlate rows without the log becoming a token dump.
 */
export function tokenFingerprint(token: string): string {
  if (token.length <= 12) return "***";
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}
