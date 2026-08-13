import type {
  AlarmDetail,
  AlarmListQuery,
  AlarmListResponse,
  UnreadCount,
} from "./alarm.js";
import type { AuthTokens, LoginRequest } from "./auth.js";
import type { Device, DeviceRegisterRequest } from "./device.js";
import type { ApiResponse } from "./common.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  /** Returns the current access token, or null when signed out. */
  getAccessToken?: () => string | null;
  fetchImpl?: typeof fetch;
};

/**
 * Transport-agnostic API client. Depends only on fetch, so the Phase B React
 * Native app can use this file unchanged - it is the one part of the simulation
 * front end that genuinely ports over.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.getAccessToken = options.getAccessToken ?? (() => null);
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  private async request<T>(
    method: string,
    path: string,
    options: { body?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };

    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    if (options.auth !== false) {
      const token = this.getAccessToken();
      if (token) headers["authorization"] = `Bearer ${token}`;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    let payload: ApiResponse<T>;
    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new ApiError(response.status, "INVALID_RESPONSE", `Non-JSON response (${response.status})`);
    }

    if (!response.ok || payload.error) {
      const error = payload.error;
      throw new ApiError(
        response.status,
        error?.code ?? "INTERNAL_ERROR",
        error?.message ?? `Request failed (${response.status})`,
        error?.requestId,
      );
    }

    return payload.data as T;
  }

  login(body: LoginRequest): Promise<AuthTokens> {
    return this.request("POST", "/v1/auth/login", { body, auth: false });
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.request("POST", "/v1/auth/refresh", {
      body: { refreshToken },
      auth: false,
    });
  }

  logout(refreshToken: string): Promise<{ ok: true }> {
    return this.request("POST", "/v1/auth/logout", { body: { refreshToken } });
  }

  registerDevice(body: DeviceRegisterRequest): Promise<Device> {
    return this.request("POST", "/v1/devices/register", { body });
  }

  listAlarms(query: Partial<AlarmListQuery> = {}): Promise<AlarmListResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.request("GET", `/v1/alarms${suffix}`);
  }

  getAlarm(alarmId: string): Promise<AlarmDetail> {
    return this.request("GET", `/v1/alarms/${encodeURIComponent(alarmId)}`);
  }

  getUnreadCount(): Promise<UnreadCount> {
    return this.request("GET", "/v1/alarms/unread-count");
  }

  markRead(alarmId: string): Promise<{ alarmId: string; readAt: string }> {
    return this.request("POST", `/v1/alarms/${encodeURIComponent(alarmId)}/read`);
  }
}
