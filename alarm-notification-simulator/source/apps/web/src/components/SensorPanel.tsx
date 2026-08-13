import { useCallback, useEffect, useState } from "react";
import { opsApi } from "../api/client.js";
import type { Sensor, SetValueResult, SourceEventRow } from "../api/types.js";
import { Badge, EmptyState, Toggle, clockTime } from "./ui.js";
import "./sensor-panel.css";

/**
 * The customer's side of the flow: a reading is evaluated against thresholds,
 * and crossing one writes a row for the notification program to collect.
 *
 * The value is a real number the operator can move, not a canned message —
 * without it there is no way to show the difference between 50 degrees and 90.
 */
export function SensorPanel({ onRowWritten }: { onRowWritten: () => void }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [rows, setRows] = useState<SourceEventRow[]>([]);
  const [writeEveryReading, setWriteEveryReading] = useState(false);
  const [lastResult, setLastResult] = useState<SetValueResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [sensorList, sourceEvents] = await Promise.all([
        opsApi.listSensors(),
        opsApi.listSourceEvents(),
      ]);
      setSensors(sensorList.items);
      setRows(sourceEvents.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The flag flips to 2 when the poller collects the row, which happens on the
  // API's own schedule - so the table has to be re-read to show the handoff.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function setValue(sensorId: string, value: number) {
    try {
      const result = await opsApi.setSensorValue(sensorId, value, writeEveryReading);
      setLastResult(result);
      setSensors((current) =>
        current.map((sensor) =>
          sensor.id === sensorId ? { ...sensor, value: result.value, level: result.level } : sensor,
        ),
      );
      if (result.row) onRowWritten();
      void refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const pending = rows.filter((row) => row.flag === 1).length;

  return (
    <div className="sensors">
      {error ? <p className="sensors__error">{error}</p> : null}

      {sensors.length === 0 ? (
        <EmptyState>載入感測器中…</EmptyState>
      ) : (
        <ul className="sensors__list">
          {sensors.map((sensor) => (
            <li key={sensor.id} className="sensor" data-level={sensor.level}>
              <div className="sensor__head">
                <span className="sensor__label">{sensor.label}</span>
                <span className="sensor__reading mono">
                  {sensor.value}
                  <em>{sensor.unit}</em>
                </span>
              </div>

              <input
                className="sensor__slider"
                type="range"
                min={sensor.min}
                max={sensor.max}
                step={0.5}
                value={sensor.value}
                onChange={(event) => void setValue(sensor.id, Number(event.target.value))}
                aria-label={`${sensor.label} 讀值`}
              />

              <div className="sensor__scale">
                <span>{sensor.min}</span>
                <span className="sensor__threshold" data-tone="yellow">
                  黃 {sensor.yellow}
                </span>
                <span className="sensor__threshold" data-tone="red">
                  紅 {sensor.red}
                </span>
                <span>{sensor.max}</span>
              </div>

              <div className="sensor__foot">
                <span className="sensor__light" data-level={sensor.level}>
                  <i />
                  {sensor.level === "RED"
                    ? "紅燈 告警"
                    : sensor.level === "YELLOW"
                      ? "黃燈 警告"
                      : "正常"}
                </span>
                <span className="sensor__device mono">{sensor.deviceId}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Toggle
        checked={writeEveryReading}
        onChange={setWriteEveryReading}
        danger
        label="每次讀值都寫入"
        hint="模擬感測器抖動；關閉時只在燈號變化才寫入"
      />

      {lastResult ? (
        <p className="sensors__note" data-wrote={lastResult.row ? true : undefined}>
          {lastResult.note}
        </p>
      ) : null}

      <div className="source-table">
        <p className="source-table__title">
          客戶資料庫 source_alarm_events
          <em>
            flag 1 = 等待取件 · 2 = 通知程式已取走
            {pending > 0 ? ` · 目前 ${pending} 筆待取` : ""}
          </em>
        </p>

        {rows.length === 0 ? (
          <EmptyState>尚無資料列 — 把上方滑桿推過門檻</EmptyState>
        ) : (
          <table>
            <thead>
              <tr>
                <th>id</th>
                <th>指標</th>
                <th>數值</th>
                <th>燈號</th>
                <th>flag</th>
                <th>取走</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-pending={row.flag === 1 || undefined}>
                  <td className="mono">{row.id}</td>
                  <td className="truncate">{row.metricLabel}</td>
                  <td className="mono">
                    {row.value}
                    {row.unit}
                  </td>
                  <td>
                    <Badge tone={row.level === "RED" ? "bad" : "warn"}>
                      {row.level === "RED" ? "紅" : "黃"}
                    </Badge>
                  </td>
                  <td className="mono">
                    <span className="flag" data-flag={row.flag}>
                      {row.flag}
                    </span>
                  </td>
                  <td className="mono source-table__time">
                    {row.pickedUpAt ? clockTime(row.pickedUpAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
