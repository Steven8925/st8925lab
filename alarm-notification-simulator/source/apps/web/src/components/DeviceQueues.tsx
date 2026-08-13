import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/client.js";
import type { AdminDevice, DeviceQueue } from "../api/types.js";
import { Badge, EmptyState, clockTime } from "./ui.js";
import "./device-queues.css";

/**
 * Per-device transport state, including the store-and-forward queue.
 *
 * The queue shown here is NOT the same thing as a recipient's unread count:
 *
 *   queued  pushes accepted for a handset that was not connected. They have not
 *           reached the device at all, and will be delivered on reconnect.
 *   unread  alarms stored in the database that a person has not yet opened.
 *
 * Conflating the two hides the single most important fact about push delivery:
 * a missing acknowledgement is not proof of loss, because the message may be
 * sitting right here waiting for the phone to come back.
 */
export function DeviceQueues({ refreshSignal }: { refreshSignal: number }) {
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [openToken, setOpenToken] = useState<string | null>(null);
  const [queue, setQueue] = useState<DeviceQueue | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await adminApi.listDevices();
      setDevices(result.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshSignal]);

  // Queue depth changes whenever a push is accepted for an offline device or a
  // reconnect flushes it, neither of which this component initiates.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  const loadQueue = useCallback(async (pushToken: string) => {
    try {
      setQueue(await adminApi.getQueue(pushToken));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    if (!openToken) {
      setQueue(null);
      return;
    }
    void loadQueue(openToken);
    const timer = setInterval(() => void loadQueue(openToken), 2000);
    return () => clearInterval(timer);
  }, [openToken, loadQueue]);

  const totalQueued = devices.reduce((sum, device) => sum + device.queuedPushes, 0);

  return (
    <div className="queues">
      {error ? <p className="queues__error">{error}</p> : null}

      <p className="queues__legend">
        <strong>待送佇列 ≠ 未讀</strong>
        <em>
          待送 = 供應商已接受但手機當時不在線，尚未抵達裝置；未讀 = 已存進資料庫、人還沒看
        </em>
      </p>

      {devices.length === 0 ? (
        <EmptyState>尚無已註冊裝置</EmptyState>
      ) : (
        <ul className="queues__list">
          {devices.map((device) => {
            const expanded = openToken === device.pushToken;

            return (
              <li key={device.id} className="qdev" data-queued={device.queuedPushes > 0 || undefined}>
                <button
                  type="button"
                  className="qdev__row"
                  onClick={() => setOpenToken(expanded ? null : device.pushToken)}
                >
                  <span className="qdev__main">
                    <span className="qdev__label truncate">
                      {device.label ?? device.platform}
                    </span>
                    <span className="qdev__email truncate mono">{device.email}</span>
                  </span>

                  <span className="qdev__meta">
                    <span className="qdev__link" data-connected={device.connected || undefined}>
                      <i />
                      {device.uninstalled
                        ? "已解除安裝"
                        : device.connected
                          ? "在線"
                          : "離線"}
                    </span>
                    <Badge tone={device.queuedPushes > 0 ? "warn" : "neutral"}>
                      待送 {device.queuedPushes}
                    </Badge>
                    <span className="qdev__state mono">{device.appState}</span>
                  </span>
                </button>

                {expanded ? (
                  <div className="qdev__queue">
                    {!queue ? (
                      <p className="qdev__empty">讀取佇列…</p>
                    ) : queue.items.length === 0 ? (
                      <p className="qdev__empty">
                        佇列是空的
                        {device.connected ? "（裝置在線，推播直接送出）" : ""}
                      </p>
                    ) : (
                      <ol className="qitems">
                        {queue.items.map((item) => (
                          <li key={item.ticketId}>
                            <p className="qitems__title truncate">{item.title}</p>
                            <p className="qitems__times mono">
                              發生 {clockTime(item.occurredAt)} ｜ 發送 {clockTime(item.sentAt)}
                            </p>
                            <p className="qitems__ids mono truncate">
                              ticket {item.ticketId.slice(0, 8)} · alarm{" "}
                              {item.alarmId.slice(0, 8)}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {totalQueued > 0 ? (
        <p className="queues__total">
          共 {totalQueued} 則推播等待裝置上線
          <em>把手機登出或模擬解除安裝，再觸發告警，就會看到佇列累積</em>
        </p>
      ) : null}
    </div>
  );
}
