import type { AlarmListItem } from "@alarm/contracts";
import type {
  AdminDevice,
  AdminUser,
  AlarmLedger,
  ConsolePolicy,
  DeviceQueue,
  FlapResult,
  OpsEventRecord,
  Scenario,
  Sensor,
  SetValueResult,
  SourceEventRow,
  TriggerInput,
} from "./types.js";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
export const OPS_BASE = import.meta.env.VITE_OPS_BASE_URL ?? "http://localhost:4000";

/**
 * Password prefill for the phone panels. Development convenience ONLY.
 *
 * Vite inlines every VITE_* variable into the client bundle, so this must never
 * hold a real credential and must never exist in a production build. It only
 * prefills the field; nothing signs in automatically.
 */
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? "";

export class ConsoleApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ConsoleApiError";
  }
}

async function request<T>(
  base: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    // A dead server is the most common failure while demonstrating, so it gets
    // a message that names the actual cause rather than "Failed to fetch".
    throw new ConsoleApiError(
      0,
      "UNREACHABLE",
      `無法連線到 ${base} — 該服務是否已啟動？ / Cannot reach ${base} — is it running?`,
    );
  }

  const text = await response.text();
  let payload: { data?: unknown; error?: { code?: string; message?: string } } = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new ConsoleApiError(response.status, "INVALID_RESPONSE", text.slice(0, 200));
  }

  if (!response.ok || payload.error) {
    throw new ConsoleApiError(
      response.status,
      payload.error?.code ?? "UNKNOWN",
      payload.error?.message ?? `Request failed (${response.status})`,
    );
  }

  return payload.data as T;
}

/* ---------------------------------------------------------------- API :3000 */

export const adminApi = {
  listUsers: () => request<{ items: AdminUser[] }>(API_BASE, "/v1/admin/users"),
  /** Display-only policy values, served from the API's own config. */
  policy: () => request<ConsolePolicy>(API_BASE, "/v1/admin/policy"),
  listDevices: () => request<{ items: AdminDevice[] }>(API_BASE, "/v1/admin/devices"),
  getLedger: (alarmId: string) =>
    request<AlarmLedger>(API_BASE, `/v1/admin/alarms/${encodeURIComponent(alarmId)}/ledger`),
  uninstall: (pushToken: string) =>
    request<{ deviceId: string; uninstalled: boolean; note: string }>(
      API_BASE,
      "/v1/admin/simulator/uninstall",
      { method: "POST", body: JSON.stringify({ pushToken }) },
    ),

  /** Store-and-forward queue for one handset — read without draining. */
  getQueue: (pushToken: string) =>
    request<DeviceQueue>(
      API_BASE,
      `/v1/admin/simulator/queue?pushToken=${encodeURIComponent(pushToken)}`,
    ),
};

export const phoneApi = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: AdminUser }>(
      API_BASE,
      "/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),

  registerDevice: (accessToken: string, body: Record<string, unknown>) =>
    request<{ id: string }>(API_BASE, "/v1/devices/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  listAlarms: (accessToken: string) =>
    request<{ items: AlarmListItem[]; nextCursor: string | null }>(
      API_BASE,
      "/v1/alarms?limit=30",
      { headers: { authorization: `Bearer ${accessToken}` } },
    ),

  getAlarm: (accessToken: string, alarmId: string) =>
    request<Record<string, unknown>>(API_BASE, `/v1/alarms/${encodeURIComponent(alarmId)}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  unreadCount: (accessToken: string) =>
    request<{ unreadCount: number }>(API_BASE, "/v1/alarms/unread-count", {
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  markRead: (accessToken: string, alarmId: string) =>
    request<{ alarmId: string; readAt: string }>(
      API_BASE,
      `/v1/alarms/${encodeURIComponent(alarmId)}/read`,
      { method: "POST", headers: { authorization: `Bearer ${accessToken}` } },
    ),

  acknowledge: (accessToken: string, alarmId: string) =>
    request<Record<string, unknown>>(
      API_BASE,
      `/v1/alarms/${encodeURIComponent(alarmId)}/ack`,
      { method: "POST", headers: { authorization: `Bearer ${accessToken}` } },
    ),

  resolve: (accessToken: string, alarmId: string) =>
    request<Record<string, unknown>>(
      API_BASE,
      `/v1/alarms/${encodeURIComponent(alarmId)}/resolve`,
      { method: "POST", headers: { authorization: `Bearer ${accessToken}` } },
    ),
};

/* ---------------------------------------------------------------- OPS :4000 */

export const opsApi = {
  listScenarios: () => request<{ items: Scenario[] }>(OPS_BASE, "/v1/scenarios"),

  listEvents: () =>
    request<{ items: OpsEventRecord[]; stats: { total: number } }>(OPS_BASE, "/v1/events"),

  trigger: (input: TriggerInput) =>
    request<OpsEventRecord>(OPS_BASE, "/v1/trigger", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  flap: (input: TriggerInput & { count: number; intervalMs?: number }) =>
    request<FlapResult>(OPS_BASE, "/v1/flap", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /* --- Threshold sensors ------------------------------------------------- */

  listSensors: () => request<{ items: Sensor[] }>(OPS_BASE, "/v1/sensors"),

  setSensorValue: (sensorId: string, value: number, writeEveryReading = false) =>
    request<SetValueResult>(OPS_BASE, `/v1/sensors/${encodeURIComponent(sensorId)}/value`, {
      method: "POST",
      body: JSON.stringify({ value, writeEveryReading }),
    }),

  listSourceEvents: () =>
    request<{ items: SourceEventRow[]; stats: { total: number; pending: number } }>(
      OPS_BASE,
      "/v1/source-events",
    ),
};
