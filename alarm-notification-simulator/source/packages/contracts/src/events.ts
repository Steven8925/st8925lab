/**
 * Server event names, per README.md §14.1. These are emitted both to the
 * structured log and to the admin SSE stream that feeds the middle pane of the
 * simulation page, so what the operator sees is exactly what was logged.
 */
export const SERVER_EVENTS = [
  "webhook_received",
  "webhook_rejected",
  "webhook_duplicate",
  /** A row was taken from a pull-based customer source (threshold table). */
  "source_row_picked_up",
  /** A source row did not match the adapter's expected shape. */
  "source_row_rejected",
  /** The source could not be read at all - the customer system may be down. */
  "source_poll_failed",
  "alarm_created",
  "alarm_duplicate",
  /** Requested recipients that could not be mapped to an account. */
  "recipient_unresolved",
  /** Stored alarm that nobody at all can be notified about. */
  "alarm_no_recipients",
  "push_send_started",
  "push_ticket_accepted",
  "push_ticket_failed",
  "push_receipt_delivered",
  "push_receipt_failed",
  "push_receipt_suppressed",
  "push_receipt_invalid_token",
  /** A resolved recipient that no device could reach. */
  "recipient_undeliverable",
  "device_registered",
  "device_deactivated",
  "device_connected",
  "device_disconnected",
  "alarm_read",
  /** The human pressed "I have seen this". */
  "alarm_acknowledged",
  /** The human pressed "this has been dealt with". */
  "alarm_resolved",
  /** Simulation data older than the retention window was deleted. */
  "test_data_purged",
  /** The retention sweep failed - the console's retention claim is at risk. */
  "test_data_purge_failed",
] as const;

export type ServerEventName = (typeof SERVER_EVENTS)[number];

export type ServerEvent = {
  id: string;
  event: ServerEventName;
  at: string;
  requestId?: string;
  alarmId?: string;
  deviceId?: string;
  userId?: string;
  source?: string;
  /** Human-readable one-liner for the console. Never contains a push token. */
  message: string;
  /** Extra structured context. Sanitised - tokens are always truncated. */
  context?: Record<string, unknown>;
};

export const ADMIN_STREAM_PATH = "/v1/admin/stream";
