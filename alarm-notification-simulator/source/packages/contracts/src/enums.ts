import { z } from "zod";

/**
 * SQLite has no native enum type, so these are stored as TEXT columns and
 * enforced here instead. Keeping the union in one place means switching the
 * Prisma datasource to PostgreSQL later does not change any application code.
 */

export const alarmSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);
export type AlarmSeverity = z.infer<typeof alarmSeveritySchema>;

/** Wire format used by the operations server webhook (lower case). */
export const webhookSeveritySchema = z.enum(["info", "warning", "critical"]);
export type WebhookSeverity = z.infer<typeof webhookSeveritySchema>;

export const platformSchema = z.enum(["IOS", "ANDROID", "SIMULATOR"]);
export type Platform = z.infer<typeof platformSchema>;

export const wirePlatformSchema = z.enum(["ios", "android", "simulator"]);
export type WirePlatform = z.infer<typeof wirePlatformSchema>;

export const userRoleSchema = z.enum(["MANAGER", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * Physical delivery state for ONE device.
 *
 *   PENDING          queued, not yet handed to the provider
 *   ACCEPTED         provider took the request and issued a ticket
 *   DELIVERED        provider receipt says it reached the transport
 *   DEVICE_CONFIRMED the handset itself confirmed - SIMULATOR ONLY, see below
 *   SUPPRESSED       reached the handset, but the OS refused to show it
 *                    (e.g. Android 13+ POST_NOTIFICATIONS denied)
 *   FAILED           permanent failure other than a bad token
 *   INVALID_TOKEN    DeviceNotRegistered; the device row gets deactivated
 *
 * ACCEPTED is not delivery and DELIVERED is not "the person saw it". SUPPRESSED
 * is the sharpest illustration: the notification provably arrived and the human
 * provably never saw it. Only an explicit acknowledgement proves a human was
 * reached.
 */
export const pushDeliveryStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DELIVERED",
  "DEVICE_CONFIRMED",
  "SUPPRESSED",
  "FAILED",
  "INVALID_TOKEN",
]);
export type PushDeliveryStatus = z.infer<typeof pushDeliveryStatusSchema>;

/**
 * Logical state for ONE intended human recipient, independent of how many
 * devices they own.
 *
 *   PENDING        no device has confirmed receipt yet
 *   DELIVERED      at least one of their devices confirmed
 *   ACKED          they pressed "acknowledge" - I have seen this
 *   RESOLVED       they pressed "resolve" - this has been dealt with
 *   UNDELIVERABLE  no device could be reached at all
 *
 * IMPORTANT: PENDING is not evidence of non-delivery. A phone that is switched
 * off, in a lift, or whose app an OEM battery manager killed produces no
 * acknowledgement even though the notification may be sitting in the tray.
 * Escalate on a timeout; never "retry harder" on the assumption it was lost.
 */
export const alarmRecipientStateSchema = z.enum([
  "PENDING",
  "DELIVERED",
  "ACKED",
  "RESOLVED",
  "UNDELIVERABLE",
]);
export type AlarmRecipientState = z.infer<typeof alarmRecipientStateSchema>;

/** Why a requested recipient could not be mapped to a user account. */
export const unresolvedReasonSchema = z.enum(["UNKNOWN_USER", "INACTIVE_USER"]);
export type UnresolvedReason = z.infer<typeof unresolvedReasonSchema>;

/** Why no device could be reached for a recipient we did resolve. */
export const undeliverableReasonSchema = z.enum([
  "NO_ACTIVE_DEVICE",
  "ALL_TOKENS_INVALID",
  "ALL_SENDS_FAILED",
]);
export type UndeliverableReason = z.infer<typeof undeliverableReasonSchema>;

export const SEVERITY_RANK: Record<AlarmSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

export function toAlarmSeverity(value: WebhookSeverity): AlarmSeverity {
  return value.toUpperCase() as AlarmSeverity;
}

export function toPlatform(value: WirePlatform): Platform {
  return value.toUpperCase() as Platform;
}
