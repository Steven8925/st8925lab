/**
 * WebSocket protocol between the notification API and the phone simulator.
 *
 * In Phase B this whole channel is replaced by FCM/APNs. Nothing in the alarm
 * pipeline knows this file exists - it is confined behind PushProvider.
 */

/** What the simulated phone is doing right now. Mirrors real OS app states. */
export type SimulatedAppState =
  | "LOCKED" // screen locked, app not running in foreground
  | "FOREGROUND" // app open and visible
  | "BACKGROUND" // app backgrounded but alive
  | "TERMINATED"; // app killed by the OS or the user

export type SimulatorPushEnvelope = {
  ticketId: string;
  alarmId: string;
  /**
   * The visible heading, already carrying the alarm's quotable code:
   * `[CRITICAL] 水溫 紅燈告警 (TANK01-20260813-01)`.
   *
   * The code is deliberately NOT a separate field here. Expo, FCM and APNs have
   * nowhere to put an extra top-level key, so a field the real transports must
   * drop would be a seam that only works in the simulator. Anything needing the
   * code structured reads it from the authenticated API, which is the same rule
   * the rest of the payload follows.
   */
  title: string;
  /** Includes the rendered timestamp line. */
  body: string;
  /**
   * Data payload: an identifier and the two timestamps, never alarm content.
   *
   * `occurredAt` is when the condition happened; `sentAt` is when we tried to
   * tell the recipient. The gap between them is diagnostic on its own.
   */
  data: { type: "alarm"; alarmId: string; occurredAt: string; sentAt: string };
  /** When the alarm condition occurred, per the source system. */
  occurredAt: string;
  /** When this push was composed and handed to the transport. */
  sentAt: string;
  priority: "default" | "high";
};

/** Server -> phone simulator. */
export type SimulatorServerMessage =
  | { type: "registered"; deviceId: string; pushToken: string }
  | { type: "push"; envelope: SimulatorPushEnvelope }
  | { type: "error"; code: string; message: string };

/** Phone simulator -> server. */
export type SimulatorClientMessage =
  /** Device confirms the push reached it. Drives the DELIVERED receipt. */
  | { type: "ack"; ticketId: string }
  /**
   * Device reports the OS refused to display the notification, e.g. Android 13+
   * POST_NOTIFICATIONS denied. The push arrived at the device but the user
   * never saw it - a distinction real delivery reports also make.
   */
  | { type: "suppressed"; ticketId: string; reason: "PERMISSION_DENIED" }
  | { type: "state"; state: SimulatedAppState };

export const SIMULATOR_WS_PATH = "/ws/device";
