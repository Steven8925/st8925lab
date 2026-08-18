import { useEffect, useState } from "react";
import { opsApi } from "../api/client.js";
import type { AdminUser, FlapResult, OpsEventRecord, Scenario } from "../api/types.js";
import type { FleetMachine } from "../constants/fleet.js";
import { Badge, EmptyState, Field, Panel, SeverityTag, Toggle, clockTime } from "./ui.js";
import "./trigger-console.css";

type Props = {
  users: AdminUser[];
  selectedDevice?: FleetMachine;
  onEventRaised: (record: OpsEventRecord) => void;
  onAlarmSelected: (alarmId: string) => void;
};

type SignatureMode = "valid" | "invalid" | "missing";
type SourceFormat = "standard" | "legacy-ops-v1";

export function TriggerConsole({ users, selectedDevice, onEventRaised, onAlarmSelected }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioId, setScenarioId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [format, setFormat] = useState<SourceFormat>("standard");
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("valid");
  const [omitDedupKey, setOmitDedupKey] = useState(false);
  const [flapCount, setFlapCount] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFlap, setLastFlap] = useState<FlapResult | null>(null);
  const [history, setHistory] = useState<OpsEventRecord[]>([]);

  useEffect(() => {
    opsApi
      .listScenarios()
      .then((result) => {
        setScenarios(result.items);
        setScenarioId((current) => current || (result.items[0]?.id ?? ""));
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, []);

  // Default to every seeded manager, so the first click of a demo works without
  // any setup at all.
  useEffect(() => {
    setSelectedUserIds((current) =>
      current.length > 0 ? current : users.filter((user) => user.active).map((user) => user.id),
    );
  }, [users]);

  const scenario = scenarios.find((entry) => entry.id === scenarioId);
  const selectedUsers = users.filter((user) => selectedUserIds.includes(user.id));

  function buildInput() {
    return {
      scenarioId,
      format,
      signatureMode,
      omitDedupKey,
      // The legacy format identifies people by email rather than by internal id
      // - which is exactly why it exists as a worked example.
      ...(format === "legacy-ops-v1"
        ? { recipientEmails: selectedUsers.map((user) => user.email) }
        : { recipientUserIds: selectedUserIds }),
    };
  }

  async function run(action: "trigger" | "flap") {
    if (!scenarioId) return;
    setBusy(true);
    setError(null);
    setLastFlap(null);

    try {
      if (action === "trigger") {
        const record = await opsApi.trigger(buildInput());
        setHistory((previous) => [record, ...previous].slice(0, 40));
        onEventRaised(record);
        if (record.alarmId) onAlarmSelected(record.alarmId);
      } else {
        const result = await opsApi.flap({ ...buildInput(), count: flapCount, intervalMs: 0 });
        setLastFlap(result);
        setHistory((previous) => [...result.records.slice().reverse(), ...previous].slice(0, 40));
        for (const record of result.records) onEventRaised(record);
        const created = result.records.find((record) => record.outcome === "ACCEPTED");
        if (created?.alarmId) onAlarmSelected(created.alarmId);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  return (
    <Panel
      title="②  直接觸發（跳過門檻）"
      subtitle="Webhook path · 用於測試簽章與去重"
    >
      <div className="trigger">
        <Field label="情境 Scenario">
          <select
            value={scenarioId}
            onChange={(event) => setScenarioId(event.target.value)}
            disabled={scenarios.length === 0}
          >
            {scenarios.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>

        {scenario ? (
          <div className="trigger__preview">
            <div className="trigger__preview-head">
              <SeverityTag severity={scenario.severity} />
              <Badge tone={scenario.deduplicated ? "accent" : "warn"}>
                {scenario.deduplicated ? "有去重鍵 dedup" : "不去重 no dedup"}
              </Badge>
            </div>
            <p className="trigger__preview-title">
              {selectedDevice ? `[${selectedDevice.sn}] ${selectedDevice.name} · ` : ""}
              {scenario.title}
            </p>
            <p className="trigger__preview-body">
              {selectedDevice ? `【${selectedDevice.model}】` : ""}
              {scenario.body}
            </p>
          </div>
        ) : null}

        <Field label={`收件人 Recipients (${selectedUserIds.length})`}>
          <div className="trigger__recipients">
            {users.length === 0 ? (
              <span className="trigger__hint">尚無使用者 — 請先執行 npm run db:seed</span>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="recipient"
                  data-selected={selectedUserIds.includes(user.id) || undefined}
                  data-inactive={!user.active || undefined}
                  onClick={() => toggleUser(user.id)}
                >
                  <span className="recipient__name">{user.displayName ?? user.email}</span>
                  <span className="recipient__email mono truncate">{user.email}</span>
                </button>
              ))
            )}
          </div>
        </Field>

        <Field label="來源格式 Source format">
          <div className="segmented">
            {(["standard", "legacy-ops-v1"] as const).map((option) => (
              <button
                key={option}
                type="button"
                data-active={format === option || undefined}
                onClick={() => setFormat(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </Field>

        <div className="trigger__faults">
          <p className="trigger__faults-title">
            故障注入 Fault injection
            <em>證明防護真的會拒絕 · proves the control rejects</em>
          </p>

          <Field label="簽章 Signature">
            <div className="segmented segmented--danger">
              {(
                [
                  ["valid", "正確 valid"],
                  ["invalid", "錯誤 invalid"],
                  ["missing", "缺少 missing"],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  data-active={signatureMode === value || undefined}
                  data-danger={value !== "valid" || undefined}
                  onClick={() => setSignatureMode(value)}
                >
                  {text}
                </button>
              ))}
            </div>
          </Field>

          <Toggle
            checked={omitDedupKey}
            onChange={setOmitDedupKey}
            danger
            label="移除去重鍵 Omit dedup key"
            hint="關掉後，抖動的感測器會逐則通知手機"
          />
        </div>

        <div className="trigger__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !scenarioId}
            onClick={() => void run("trigger")}
          >
            {busy ? "送出中…" : "觸發告警 Raise alarm"}
          </button>

          <div className="trigger__flap">
            <button
              type="button"
              className="btn"
              disabled={busy || !scenarioId}
              onClick={() => void run("flap")}
            >
              感測器抖動 ×{flapCount}
            </button>
            <input
              type="number"
              min={2}
              max={20}
              value={flapCount}
              onChange={(event) => setFlapCount(Number(event.target.value) || 6)}
              aria-label="抖動次數 flap count"
            />
          </div>
        </div>

        {error ? <p className="trigger__error">{error}</p> : null}

        {lastFlap ? (
          <div className="trigger__flap-result" data-dedup={!omitDedupKey || undefined}>
            <strong>
              送出 {lastFlap.sent} · 建立 {lastFlap.alarmsCreated} · 攔截 {lastFlap.duplicatesSuppressed}
            </strong>
            <p>{lastFlap.summary}</p>
          </div>
        ) : null}

        <div className="trigger__log">
          <p className="trigger__log-title">
            營運端自有紀錄 Operations own log
            <em>來源系統看得到的真相 · what the source system can see</em>
          </p>

          {history.length === 0 ? (
            <EmptyState>尚未觸發任何事件</EmptyState>
          ) : (
            <ul className="ops-log">
              {history.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    className="ops-log__row"
                    disabled={!record.alarmId}
                    onClick={() => record.alarmId && onAlarmSelected(record.alarmId)}
                  >
                    <span className="ops-log__time mono">{clockTime(record.at)}</span>
                    <Badge tone={record.outcome}>{record.outcome}</Badge>
                    <span className="ops-log__title truncate">{record.title}</span>
                    <span className="ops-log__status mono">
                      {record.httpStatus ?? "ERR"}
                    </span>
                  </button>
                  <p className="ops-log__note">{record.note}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
