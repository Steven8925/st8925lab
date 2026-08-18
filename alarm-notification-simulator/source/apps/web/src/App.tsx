import { useCallback, useEffect, useState } from "react";
import { adminApi, API_BASE, OPS_BASE } from "./api/client.js";
import type { AdminUser, ConsolePolicy } from "./api/types.js";
import { PRODUCTION_FLEET } from "./constants/fleet.js";
import { DeviceQueues } from "./components/DeviceQueues.js";
import { EventStream } from "./components/EventStream.js";
import { Ledger } from "./components/Ledger.js";
import { Phone } from "./components/Phone.js";
import { SensorPanel } from "./components/SensorPanel.js";
import { TriggerConsole } from "./components/TriggerConsole.js";
import { Panel } from "./components/ui.js";
import "./app.css";

const PHONE_LABELS = ["Pixel-8", "Galaxy-S24"];

export function App() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedAlarmId, setSelectedAlarmId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number>(15);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [bootError, setBootError] = useState<string | null>(null);
  /**
   * Null until the API answers. The retention notice is NOT rendered from a
   * hardcoded number: the console must state the figure the server actually
   * enforces, or the header becomes a promise nothing keeps.
   */
  const [policy, setPolicy] = useState<ConsolePolicy | null>(null);

  const selectedDevice =
    PRODUCTION_FLEET.find((m) => m.id === selectedDeviceId) ?? PRODUCTION_FLEET[0];

  const bump = useCallback(() => setRefreshSignal((value) => value + 1), []);

  useEffect(() => {
    adminApi
      .listUsers()
      .then((result) => setUsers(result.items))
      .catch((cause: unknown) =>
        setBootError(cause instanceof Error ? cause.message : String(cause)),
      );

    // A failed policy fetch leaves the notice hidden rather than guessing:
    // showing no claim is honest, showing an unverified one is not.
    adminApi
      .policy()
      .then(setPolicy)
      .catch(() => setPolicy(null));
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <h1>
            告警通知模擬台
            {policy && policy.testDataRetentionDays > 0 ? (
              <em className="app__retention">
                測試資料只保留最近 {policy.testDataRetentionDays} 天內的資訊與紀錄
              </em>
            ) : null}
            <span>Alarm Notification Simulation Console</span>
          </h1>
        </div>

        <div className="app__meta">
          <span className="app__endpoint mono">
            API <b>{API_BASE.replace(/^https?:\/\//, "")}</b>
          </span>
          <span className="app__endpoint mono">
            OPS <b>{OPS_BASE.replace(/^https?:\/\//, "")}</b>
          </span>
          <span className="app__phase">Phase A · 模擬階段</span>
        </div>
      </header>

      {/* ── Device Selector & Global Switcher ── */}
      <div className="device-switcher-bar">
        <div className="device-selector-group">
          <label htmlFor="deviceSelect">🔍 目標監控機組 / Active Monitored Device:</label>
          <select
            id="deviceSelect"
            className="device-dropdown"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
          >
            {PRODUCTION_FLEET.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.id}. {machine.name} ({machine.sn})
              </option>
            ))}
          </select>
        </div>
        <div className="device-meta-pills">
          <span className="pill-tag">
            <b>{selectedDevice.sn}</b>
          </span>
          <span className="pill-tag">{selectedDevice.model}</span>
          <span className="pill-tag">🟢 監控中 Active</span>
        </div>
      </div>

      {bootError ? (
        <p className="app__boot-error">
          無法載入使用者清單：{bootError}
          <em>請確認 API（:3000）已啟動，且已執行 npm run db:seed</em>
        </p>
      ) : null}

      <main className="app__grid">
        <div className="app__col app__col--left">
          <Panel
            title="① 感測器與門檻條件"
            subtitle="客戶端條件評估 → 寫入資料庫 flag=1"
          >
            <SensorPanel onRowWritten={bump} selectedDevice={selectedDevice} />
          </Panel>

          <TriggerConsole
            users={users}
            selectedDevice={selectedDevice}
            onEventRaised={bump}
            onAlarmSelected={(alarmId) => {
              setSelectedAlarmId(alarmId);
              bump();
            }}
          />
        </div>

        <div className="app__col app__col--mid">
          <EventStream onAlarmSelected={setSelectedAlarmId} selectedAlarmId={selectedAlarmId} />
          <Ledger alarmId={selectedAlarmId} refreshSignal={refreshSignal} />
        </div>

        <div className="app__col app__col--right">
          <Panel title="⑤ 手機模擬器" subtitle="Handset simulators · WebSocket /ws/device">
            <div className="app__phones">
              {PHONE_LABELS.map((label) => (
                <Phone key={label} label={label} users={users} onChanged={bump} />
              ))}
            </div>
          </Panel>

          <Panel
            title="⑥ 裝置與待送佇列"
            subtitle="Store-and-forward queue · 點裝置展開待送內容"
          >
            <DeviceQueues refreshSignal={refreshSignal} />
          </Panel>
        </div>
      </main>

      <footer className="app__footer">
        <p>
          <strong>模擬器能證明的事有上限。</strong>
          WebSocket 是可靠通道，因此「裝置確認收到」在此必然成立；
          <em>FCM / APNs 沒有等價的 per-message 回呼</em>，Phase B 換上真實推播後這一格永遠不會亮。
          ack 沒回來不等於沒送到 —— 逾時要升級，不是重推。
        </p>
      </footer>
    </div>
  );
}
