import type {
  AlarmRecipientState,
  AlarmSeverity,
  Platform,
  PushDeliveryStatus,
  SimulatedAppState,
} from "@alarm/contracts";

/**
 * Response shapes for the console-only endpoints.
 *
 * These deliberately live here rather than in @alarm/contracts: the admin and
 * operations-server endpoints exist to drive this simulation and disappear with
 * it in Phase B. Only shapes the real mobile app will also consume belong in
 * the shared contracts package.
 */

/**
 * Policy values the console displays, read from the API rather than hardcoded.
 *
 * The retention figure in the header must be the one the server actually
 * enforces; a number typed into the UI would drift from the sweeper and turn
 * the header into a promise nothing keeps.
 */
export type ConsolePolicy = {
  /** 0 = retention disabled. The console then makes no retention claim. */
  testDataRetentionDays: number;
  testDataRetentionSweepMs: number;
  alarmReferenceTimezone: string;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  active: boolean;
};

export type AdminDevice = {
  id: string;
  userId: string;
  email: string;
  label: string | null;
  platform: Platform;
  pushToken: string;
  active: boolean;
  connected: boolean;
  uninstalled: boolean;
  appState: SimulatedAppState;
  queuedPushes: number;
};

export type LedgerDevice = {
  deviceId: string;
  label: string | null;
  platform: Platform;
  pushTokenFp: string;
  status: PushDeliveryStatus;
  errorCode: string | null;
  sentAt: string | null;
  settledAt: string | null;
  deviceConfirmedAt: string | null;
};

export type LedgerRecipient = {
  userId: string;
  email: string;
  displayName: string | null;
  state: AlarmRecipientState;
  deliveredAt: string | null;
  /** When this person opened it — who read it, and when. */
  readAt: string | null;
  ackedAt: string | null;
  resolvedAt: string | null;
  undeliverableReason: string | null;
  devices: LedgerDevice[];
};

/** Pushes accepted for a handset that was not connected. */
export type DeviceQueue = {
  deviceId: string;
  label: string | null;
  email: string;
  connected: boolean;
  depth: number;
  items: {
    ticketId: string;
    alarmId: string;
    title: string;
    body: string;
    occurredAt: string;
    sentAt: string;
    priority: string;
  }[];
};

export type AlarmLedger = {
  alarmId: string;
  title: string;
  /** The quotable code, e.g. `TANK01-20260813-07`. Null on pre-numbering alarms. */
  reference: string | null;
  severity: AlarmSeverity;
  source: string;
  occurredAt: string;
  /** When we stored it. The gap from occurredAt is the source system's lag. */
  createdAt: string;
  recipients: LedgerRecipient[];
  /** Requested by the source system but mapped to no account at all. */
  unresolvedRecipients: { identifier: string; reason: string }[];
};

export type Scenario = {
  id: string;
  label: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  deduplicated: boolean;
};

export type OpsOutcome =
  | "ACCEPTED"
  | "DUPLICATE"
  | "REJECTED"
  | "PARTIAL"
  | "NO_RECIPIENTS"
  | "TRANSPORT_ERROR";

export type OpsEventRecord = {
  id: string;
  at: string;
  scenarioId: string;
  scenarioLabel: string;
  severity: string;
  title: string;
  eventId: string;
  dedupKey: string | null;
  format: string;
  signatureMode: string;
  outcome: OpsOutcome;
  alarmId: string | null;
  /** The code the notification API issued, as recorded by the ops side. */
  reference: string | null;
  httpStatus: number | null;
  note: string;
  dispatch: {
    url: string;
    format: string;
    signatureMode: string;
    requestBody: string;
    signaturePreview: string | null;
    status: number | null;
    responseBody: unknown;
    transportError: string | null;
    durationMs: number;
  };
};

export type FlapResult = {
  sent: number;
  alarmsCreated: number;
  duplicatesSuppressed: number;
  summary: string;
  records: OpsEventRecord[];
};

/* --- Threshold sensors and the customer's simulated table ----------------- */

export type SensorLevel = "NORMAL" | "YELLOW" | "RED";

export type Sensor = {
  id: string;
  label: string;
  deviceId: string;
  metric: string;
  unit: string;
  min: number;
  max: number;
  /** Warning threshold. */
  yellow: number;
  /** Alarm threshold, needing urgent action. */
  red: number;
  value: number;
  level: SensorLevel;
};

/** A row in the customer's alarm table. Their schema, not ours. */
export type SourceEventRow = {
  id: number;
  deviceId: string;
  metric: string;
  metricLabel: string;
  value: number;
  unit: string;
  level: "YELLOW" | "RED";
  threshold: number;
  message: string;
  createdAt: string;
  /** 1 = awaiting pickup, 2 = the notification program has taken it. */
  flag: 1 | 2;
  pickedUpAt: string | null;
};

export type SetValueResult = {
  sensorId: string;
  value: number;
  previousLevel: SensorLevel;
  level: SensorLevel;
  /** Null when the reading changed nothing worth reporting. */
  row: SourceEventRow | null;
  note: string;
};

export type TriggerInput = {
  scenarioId: string;
  recipientUserIds?: string[];
  recipientEmails?: string[];
  format?: "standard" | "legacy-ops-v1";
  signatureMode?: "valid" | "invalid" | "missing";
  eventId?: string;
  omitDedupKey?: boolean;
};
