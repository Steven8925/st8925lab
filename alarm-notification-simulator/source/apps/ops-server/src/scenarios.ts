export type ScenarioSeverity = "info" | "warning" | "critical";

export type Scenario = {
  id: string;
  /** Short label for the trigger console. */
  label: string;
  severity: ScenarioSeverity;
  title: string;
  body: string;
  /** Structured payload the mobile app fetches over the authenticated API. */
  details: Record<string, unknown>;
  /**
   * Template for the deduplication key, or null when this event type must never
   * be deduplicated.
   *
   * {bucket} expands to a 5-minute time bucket. That is what makes a flapping
   * sensor collapse into one alarm instead of forty: two readings 30 seconds
   * apart land in the same bucket and produce the same key.
   */
  dedupKeyTemplate: string | null;
};

/**
 * A small catalogue of realistic operations events.
 *
 * These stand in for whatever the customer's real system emits. When the actual
 * event format is known (README.md §17 questions 1-2) this file is replaced by
 * their feed - nothing downstream of the webhook adapter changes.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "temperature-critical",
    label: "機房溫度超標（嚴重）",
    severity: "critical",
    title: "機房溫度超過上限",
    body: "主機房 R12 溫度 42.5°C，已超過設定上限 35°C。",
    details: {
      site: "main-site",
      rack: "R12",
      metric: "temperature",
      value: 42.5,
      threshold: 35,
      unit: "celsius",
    },
    dedupKeyTemplate: "temperature:main-site:R12:{bucket}",
  },
  {
    id: "ups-battery-fault",
    label: "UPS 電池故障（嚴重）",
    severity: "critical",
    title: "UPS 電池故障",
    body: "UPS-2 回報電池模組故障，市電中斷時將無法提供備援電力。",
    details: {
      site: "main-site",
      device: "UPS-2",
      metric: "battery_health",
      status: "FAULT",
      estimatedRuntimeMinutes: 0,
    },
    dedupKeyTemplate: "ups:main-site:UPS-2:{bucket}",
  },
  {
    id: "fire-suppression",
    label: "消防氣體釋放（嚴重）",
    severity: "critical",
    title: "消防抑制系統已啟動",
    body: "3 號機房消防氣體已釋放，請立即確認現場狀況並勿進入。",
    details: { site: "main-site", room: "room-3", system: "FM-200", discharged: true },
    /**
     * Never deduplicated. A second discharge is a genuinely new emergency, and
     * collapsing it into the first would hide it.
     */
    dedupKeyTemplate: null,
  },
  {
    id: "disk-usage-high",
    label: "磁碟使用率偏高（警告）",
    severity: "warning",
    title: "磁碟使用率偏高",
    body: "檔案伺服器 /var 磁區使用率已達 91%，請儘速清理。",
    details: {
      site: "main-site",
      host: "fileserver-01",
      volume: "/var",
      metric: "disk_usage_percent",
      value: 91,
      threshold: 85,
    },
    dedupKeyTemplate: "disk:fileserver-01:/var:{bucket}",
  },
  {
    id: "wan-link-flap",
    label: "WAN 線路不穩（警告）",
    severity: "warning",
    title: "WAN 主線路狀態不穩",
    body: "主要 WAN 線路在 5 分鐘內斷線 3 次，流量已切換至備援線路。",
    details: {
      site: "main-site",
      circuit: "WAN-PRIMARY",
      flapCount: 3,
      windowMinutes: 5,
      failoverActive: true,
    },
    dedupKeyTemplate: "wan:main-site:WAN-PRIMARY:{bucket}",
  },
  {
    id: "backup-completed",
    label: "夜間備份完成（資訊）",
    severity: "info",
    title: "夜間備份已完成",
    body: "每日備份工作已完成，耗時 42 分鐘，共 1.8 TB。",
    details: {
      site: "main-site",
      job: "nightly-full",
      durationMinutes: 42,
      sizeTB: 1.8,
      result: "SUCCESS",
    },
    dedupKeyTemplate: null,
  },
];

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

/** Floors a timestamp to a 5-minute bucket, e.g. 2026-08-11T10:32Z -> ...T10:30. */
export function timeBucket(at: Date, minutes = 5): string {
  const floored = new Date(at);
  floored.setSeconds(0, 0);
  floored.setMinutes(Math.floor(floored.getMinutes() / minutes) * minutes);
  return floored.toISOString().slice(0, 16);
}

export function buildDedupKey(scenario: Scenario, at: Date): string | null {
  if (!scenario.dedupKeyTemplate) return null;
  return scenario.dedupKeyTemplate.replace("{bucket}", timeBucket(at));
}
