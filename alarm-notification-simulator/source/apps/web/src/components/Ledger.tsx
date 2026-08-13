import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/client.js";
import type { AlarmLedger } from "../api/types.js";
import { EmptyState, Panel, SeverityTag, StateChip, clockTime } from "./ui.js";
import "./ledger.css";

/** Why each state matters, shown on hover so the demo explains itself. */
const STATE_HINTS: Record<string, string> = {
  PENDING: "尚無任何裝置確認收到。注意：這不是「沒送到」的證據。",
  DELIVERED: "至少一台裝置確認收到，但人還沒表示看到。",
  ACKED: "本人按下「我看到了」。",
  RESOLVED: "本人按下「已處理完」。",
  UNDELIVERABLE: "完全沒有可送達的裝置。",
  ACCEPTED: "供應商收下請求並發出 ticket — 不代表送達。",
  DEVICE_CONFIRMED: "手機本身確認收到。⚠ 僅模擬器可得，FCM/APNs 沒有這個回呼。",
  SUPPRESSED: "已到達手機，但作業系統拒絕顯示 — 確定送達、確定沒被看到。",
  INVALID_TOKEN: "回條回報 DeviceNotRegistered，裝置已停用。",
  FAILED: "永久失敗（非 token 問題）。",
};

export function Ledger({
  alarmId,
  refreshSignal,
}: {
  alarmId: string | null;
  refreshSignal: number;
}) {
  const [ledger, setLedger] = useState<AlarmLedger | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!alarmId) {
      setLedger(null);
      return;
    }
    try {
      setLedger(await adminApi.getLedger(alarmId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [alarmId]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  // Delivery state settles asynchronously (the receipt gap is deliberately
  // non-zero), so the ledger polls while an alarm is selected.
  useEffect(() => {
    if (!alarmId) return;
    const timer = setInterval(() => void load(), 1500);
    return () => clearInterval(timer);
  }, [alarmId, load]);

  return (
    <Panel
      title="④ 逐人送達帳本"
      subtitle="Per-recipient ledger · 誰收到了、誰沒有"
      actions={
        ledger ? (
          <button type="button" className="link-btn" onClick={() => void load()}>
            重新整理
          </button>
        ) : null
      }
    >
      {!alarmId ? (
        <EmptyState>選擇一則告警以查看其送達帳本</EmptyState>
      ) : error ? (
        <p className="ledger__error">{error}</p>
      ) : !ledger ? (
        <EmptyState>載入中…</EmptyState>
      ) : (
        <div className="ledger">
          <header className="ledger__head">
            <SeverityTag severity={ledger.severity} />
            <h3>{ledger.title}</h3>
            {/* The code leads the meta line: it is the name a handover sheet or a
                phone call uses, whereas the UUID beside it is for machines. */}
            <p className="mono">
              {ledger.reference ? <strong className="ledger__ref">{ledger.reference}</strong> : null}
              {ledger.reference ? " · " : ""}
              {ledger.source} · 發生 {clockTime(ledger.occurredAt)} · 建立{" "}
              {clockTime(ledger.createdAt)} · {ledger.alarmId.slice(0, 8)}
            </p>
          </header>

          {ledger.recipients.length === 0 ? (
            <p className="ledger__nobody">
              這則告警沒有任何可通知的收件人 — 但它仍被儲存下來。
              <em>丟棄它會摧毀「來源系統確實試過」的唯一證據。</em>
            </p>
          ) : (
            <ul className="ledger__recipients">
              {ledger.recipients.map((recipient) => (
                <li key={recipient.userId} className="recipient-card">
                  <div className="recipient-card__head">
                    <div>
                      <p className="recipient-card__name">
                        {recipient.displayName ?? recipient.email}
                      </p>
                      <p className="recipient-card__email mono truncate">{recipient.email}</p>
                    </div>
                    <StateChip state={recipient.state} hint={STATE_HINTS[recipient.state]} />
                  </div>

                  {/* Read and acknowledged are separate acts: opening it is not
                      the same as saying "I have seen this". */}
                  <div className="recipient-card__timeline">
                    <Step label="送達" at={recipient.deliveredAt} />
                    <Step label="開啟" at={recipient.readAt} />
                    <Step label="已看到" at={recipient.ackedAt} />
                    <Step label="已處理" at={recipient.resolvedAt} />
                  </div>

                  {recipient.undeliverableReason ? (
                    <p className="recipient-card__reason">
                      無法送達原因：<span className="mono">{recipient.undeliverableReason}</span>
                    </p>
                  ) : null}

                  {recipient.devices.length === 0 ? (
                    <p className="recipient-card__nodevice">此人沒有已註冊的裝置</p>
                  ) : (
                    <table className="device-table">
                      <thead>
                        <tr>
                          <th>裝置 Device</th>
                          <th>狀態 Status</th>
                          <th>Token</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipient.devices.map((device) => (
                          <tr key={device.deviceId}>
                            <td className="truncate">
                              {device.label ?? device.platform}
                              <em>{device.platform}</em>
                            </td>
                            <td>
                              <StateChip state={device.status} hint={STATE_HINTS[device.status]} />
                              {device.errorCode ? (
                                <span className="device-table__error mono">{device.errorCode}</span>
                              ) : null}
                            </td>
                            <td className="mono device-table__token">{device.pushTokenFp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              ))}
            </ul>
          )}

          {ledger.unresolvedRecipients.length > 0 ? (
            <div className="ledger__unresolved">
              <p className="ledger__unresolved-title">
                無法對應到帳號的收件人 Unmapped recipients
                <em>來源系統指定了，但這裡查無此人 — 記錄下來才不會靜默消失</em>
              </p>
              <ul>
                {ledger.unresolvedRecipients.map((entry) => (
                  <li key={entry.identifier}>
                    <span className="mono">{entry.identifier}</span>
                    <StateChip state="UNDELIVERABLE" hint={entry.reason} />
                    <em>{entry.reason}</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function Step({ label, at }: { label: string; at: string | null }) {
  return (
    <div className="step" data-done={at ? true : undefined}>
      <i />
      <span>{label}</span>
      {at ? <time className="mono">{clockTime(at)}</time> : null}
    </div>
  );
}
