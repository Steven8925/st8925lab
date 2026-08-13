import { z } from "zod";
import { alarmSeveritySchema, webhookSeveritySchema } from "./enums.js";

/**
 * The canonical internal alarm format (README.md §7.4).
 *
 * The customer's real operations server is not expected to emit this shape.
 * An adapter layer (apps/api/src/webhooks/adapters) translates vendor formats
 * into this schema so the core pipeline never changes when a new source is
 * onboarded.
 */
export const alarmWebhookSchema = z.object({
  eventId: z.string().min(1).max(200),
  source: z.string().min(1).max(100),
  severity: webhookSeveritySchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  occurredAt: z.string().datetime(),
  /**
   * Which equipment the alarm is about. Optional, but supply it whenever the
   * alarm has one: it is what gives the alarm a per-device reference code
   * (`TANK01-20260813-07`). Omitting it files the alarm under the device-less
   * fallback key, where every such alarm shares one daily counter.
   *
   * A number is accepted for numeric asset ids and coerced to a string.
   */
  deviceId: z.union([z.string().min(1).max(100), z.number()]).optional(),
  dedupKey: z.string().min(1).max(300).optional(),
  recipientUserIds: z.array(z.string().uuid()).min(1).max(100),
  details: z.record(z.unknown()).default({}),
});

export type AlarmWebhook = z.infer<typeof alarmWebhookSchema>;

export const alarmWebhookResultSchema = z.object({
  alarmId: z.string(),
  duplicate: z.boolean(),
});

export type AlarmWebhookResult = z.infer<typeof alarmWebhookResultSchema>;

/**
 * Alarm as returned in a list. Deliberately lean - details are detail-only.
 *
 * The four timestamps answer four different questions, and the caller needs all
 * of them to judge an alarm:
 *   occurredAt   when the condition happened, per the source system
 *   createdAt    when we stored it (the gap from occurredAt is source lag)
 *   deliveredAt  when a device of theirs confirmed receipt
 *   readAt       when THEY opened it
 *   ackedAt      when the server recorded their acknowledgement
 */
export const alarmListItemSchema = z.object({
  id: z.string(),
  severity: alarmSeveritySchema,
  title: z.string(),
  /**
   * The human-quotable code, e.g. `TANK01-20260813-01`. See reference.ts.
   *
   * Nullable because alarms stored before codes existed genuinely have none.
   * Render with formatAlarmLabel() rather than inventing a number for them.
   */
  reference: z.string().nullable(),
  body: z.string(),
  source: z.string(),
  occurredAt: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
  /** Set when at least one of the caller's devices confirmed receipt. */
  deliveredAt: z.string().nullable(),
  /** When the server recorded "I have seen this" from the caller. */
  ackedAt: z.string().nullable(),
  /** When the server recorded "this has been dealt with" from the caller. */
  resolvedAt: z.string().nullable(),
});

export type AlarmListItem = z.infer<typeof alarmListItemSchema>;

export const alarmListResponseSchema = z.object({
  items: z.array(alarmListItemSchema),
  nextCursor: z.string().nullable(),
});

export type AlarmListResponse = z.infer<typeof alarmListResponseSchema>;

export const alarmDetailSchema = alarmListItemSchema.extend({
  sourceEventId: z.string().nullable(),
  dedupKey: z.string().nullable(),
  details: z.record(z.unknown()),
});

export type AlarmDetail = z.infer<typeof alarmDetailSchema>;

export const unreadCountSchema = z.object({ unreadCount: z.number().int().min(0) });
export type UnreadCount = z.infer<typeof unreadCountSchema>;

export const alarmListQuerySchema = z.object({
  status: z.enum(["all", "unread"]).default("all"),
  severity: alarmSeveritySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type AlarmListQuery = z.infer<typeof alarmListQuerySchema>;
