import { useEffect, useMemo, useRef, useState } from "react";
import type { ServerEvent } from "@alarm/contracts";
import { ADMIN_STREAM_PATH } from "@alarm/contracts";
import { API_BASE } from "../api/client.js";
import { useEventStream } from "../hooks/useEventStream.js";
import { Badge, EmptyState, Panel, clockTime } from "./ui.js";
import "./event-stream.css";

/** Which events matter most when watching a demo, grouped for filtering. */
const GROUPS = {
  /** Pull-based ingestion: rows collected from the customer's own table. */
  source: ["source_row_picked_up", "source_row_rejected", "source_poll_failed"],
  webhook: ["webhook_received", "webhook_rejected", "webhook_duplicate"],
  alarm: ["alarm_created", "alarm_duplicate", "alarm_no_recipients", "recipient_unresolved"],
  push: [
    "push_send_started",
    "push_ticket_accepted",
    "push_ticket_failed",
    "push_receipt_delivered",
    "push_receipt_failed",
    "push_receipt_suppressed",
    "push_receipt_invalid_token",
    "recipient_undeliverable",
  ],
  device: ["device_registered", "device_deactivated", "device_connected", "device_disconnected"],
  human: ["alarm_read", "alarm_acknowledged", "alarm_resolved"],
} as const;

type GroupKey = keyof typeof GROUPS;

const GROUP_LABELS: Record<GroupKey, string> = {
  source: "取件 Source",
  webhook: "Webhook",
  alarm: "告警 Alarm",
  push: "推播 Push",
  device: "裝置 Device",
  human: "人 Human",
};

function toneFor(event: string): string {
  if (event.includes("rejected") || event.includes("failed") || event.includes("invalid")) {
    return "bad";
  }
  if (event.includes("duplicate") || event.includes("unresolved") || event.includes("suppressed")) {
    return "warn";
  }
  if (event.includes("acknowledged") || event.includes("resolved") || event.includes("delivered")) {
    return "ok";
  }
  return "neutral";
}

export function EventStream({
  onAlarmSelected,
  selectedAlarmId,
}: {
  onAlarmSelected: (alarmId: string) => void;
  selectedAlarmId: string | null;
}) {
  const { events, status, clear } = useEventStream<ServerEvent>(`${API_BASE}${ADMIN_STREAM_PATH}`);
  const [active, setActive] = useState<Set<GroupKey>>(
    () => new Set(Object.keys(GROUPS) as GroupKey[]),
  );

  /**
   * Follow the newest alarm automatically.
   *
   * Alarms arriving by polling are not the result of a click, so nothing would
   * otherwise select them and the ledger would sit empty while the phones buzz.
   * A manual click still works and holds until the next alarm arrives.
   */
  const lastAutoSelected = useRef<string | null>(null);

  useEffect(() => {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event?.event !== "alarm_created" || !event.alarmId) continue;
      if (lastAutoSelected.current === event.alarmId) return;
      lastAutoSelected.current = event.alarmId;
      onAlarmSelected(event.alarmId);
      return;
    }
  }, [events, onAlarmSelected]);

  const visible = useMemo(() => {
    const allowed = new Set<string>();
    for (const key of active) for (const name of GROUPS[key]) allowed.add(name);
    return events.filter((event) => allowed.has(event.event)).slice().reverse();
  }, [events, active]);

  function toggleGroup(key: GroupKey) {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Panel
      title="③ 伺服器事件流"
      subtitle="Server event stream · 與結構化日誌是同一份資料"
      actions={
        <>
          <span className="stream-status" data-status={status}>
            <i />
            {status === "open" ? "連線中" : status === "connecting" ? "連線…" : "已中斷"}
          </span>
          <button type="button" className="link-btn" onClick={clear}>
            清除
          </button>
        </>
      }
    >
      <div className="stream">
        <div className="stream__filters">
          {(Object.keys(GROUPS) as GroupKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="chip"
              data-active={active.has(key) || undefined}
              onClick={() => toggleGroup(key)}
            >
              {GROUP_LABELS[key]}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState>
            {status === "open"
              ? "等待事件 — 從左欄觸發一則告警"
              : "尚未連上事件流 — API 服務是否已啟動？"}
          </EmptyState>
        ) : (
          <ul className="stream__list">
            {visible.map((event) => (
              <li
                key={event.id}
                className="stream__item"
                data-tone={toneFor(event.event)}
                data-selected={
                  (event.alarmId && event.alarmId === selectedAlarmId) || undefined
                }
              >
                <button
                  type="button"
                  className="stream__row"
                  disabled={!event.alarmId}
                  onClick={() => event.alarmId && onAlarmSelected(event.alarmId)}
                >
                  <span className="stream__time mono">{clockTime(event.at)}</span>
                  <Badge tone={toneFor(event.event)}>{event.event}</Badge>
                  <span className="stream__message">{event.message}</span>
                </button>

                {event.context ? (
                  <dl className="stream__context">
                    {Object.entries(event.context)
                      .filter(([, value]) => value !== null && value !== undefined)
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd className="mono truncate">
                            {Array.isArray(value) ? value.join(", ") : String(value)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
