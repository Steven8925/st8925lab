import { useState } from "react";
import type { SimulatedAppState } from "@alarm/contracts";
import { adminApi, DEMO_PASSWORD } from "../api/client.js";
import type { AdminUser } from "../api/types.js";
import { usePhone, type UsePhoneResult } from "../hooks/usePhone.js";
import { Badge, SeverityTag, Toggle, clockTime } from "./ui.js";
import "./phone.css";

/**
 * The app's own alarm list, read from the API rather than from the socket.
 *
 * This is what makes a dropped push survivable, and the reason the badge count
 * and the notification tray can legitimately disagree: the tray holds what
 * arrived, this holds what exists.
 */
function Inbox({ phone, onChanged }: { phone: UsePhoneResult; onChanged: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (phone.alarmsLoading && phone.alarms.length === 0) {
    return <p className="phone__empty">讀取收件匣…</p>;
  }

  if (phone.alarms.length === 0) {
    return <p className="phone__empty">收件匣沒有告警</p>;
  }

  return (
    <ul className="inbox">
      {phone.alarms.map((alarm) => {
        const expanded = openId === alarm.id;

        return (
          <li key={alarm.id} className="inbox__item" data-unread={!alarm.readAt || undefined}>
            <button
              type="button"
              className="inbox__row"
              onClick={() => {
                const next = expanded ? null : alarm.id;
                setOpenId(next);
                if (next) {
                  // Opening it fetches the protected detail and marks it read -
                  // the same path the notification tap takes.
                  void phone.openAlarm(alarm.id).then(onChanged);
                }
              }}
            >
              <span className="inbox__head">
                <SeverityTag severity={alarm.severity} />
                {!alarm.readAt ? <i className="inbox__dot" aria-label="未讀" /> : null}
                <time className="mono">{clockTime(alarm.occurredAt)}</time>
              </span>
              <span className="inbox__title truncate">{alarm.title}</span>
              {/* The quotable code, visible WITHOUT opening the alarm: it is what
                  the reader says out loud when they phone someone about it. */}
              {alarm.reference ? (
                <span className="inbox__ref mono">{alarm.reference}</span>
              ) : null}
            </button>

            {expanded ? (
              <div className="inbox__detail">
                <p>{alarm.body}</p>

                {/* All four timestamps: what happened when, and what the SERVER
                    recorded about this reader's own actions. */}
                <dl className="inbox__times mono">
                  <div>
                    <dt>發生</dt>
                    <dd>{clockTime(alarm.occurredAt)}</dd>
                  </div>
                  <div>
                    <dt>建立</dt>
                    <dd>{clockTime(alarm.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>送達</dt>
                    <dd>{alarm.deliveredAt ? clockTime(alarm.deliveredAt) : "—"}</dd>
                  </div>
                  <div>
                    <dt>已讀</dt>
                    <dd>{alarm.readAt ? clockTime(alarm.readAt) : "—"}</dd>
                  </div>
                  <div>
                    <dt>伺服器收到 ack</dt>
                    <dd>{alarm.ackedAt ? clockTime(alarm.ackedAt) : "—"}</dd>
                  </div>
                  <div>
                    <dt>已處理</dt>
                    <dd>{alarm.resolvedAt ? clockTime(alarm.resolvedAt) : "—"}</dd>
                  </div>
                </dl>

                <p className="inbox__source mono">{alarm.source}</p>
                <div className="notif__actions">
                  <button
                    type="button"
                    onClick={() => void phone.acknowledge(alarm.id).then(onChanged)}
                  >
                    我看到了
                  </button>
                  <button
                    type="button"
                    onClick={() => void phone.resolve(alarm.id).then(onChanged)}
                  >
                    已處理完
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

const APP_STATES: { value: SimulatedAppState; label: string }[] = [
  { value: "LOCKED", label: "鎖定" },
  { value: "FOREGROUND", label: "前景" },
  { value: "BACKGROUND", label: "背景" },
  { value: "TERMINATED", label: "已終止" },
];

export function Phone({
  label,
  users,
  onChanged,
}: {
  label: string;
  users: AdminUser[];
  onChanged: () => void;
}) {
  const phone = usePhone(label);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [uninstallNote, setUninstallNote] = useState<string | null>(null);
  /**
   * "tray" is the notification shade - only what arrived over this socket.
   * "inbox" is the app's own list, fetched from the API.
   *
   * Keeping them separate is the point: a reload empties the tray while the
   * inbox still shows everything waiting, which is what makes a dropped push
   * survivable.
   */
  const [view, setView] = useState<"tray" | "inbox">("tray");

  const chosenEmail = email || users[0]?.email || "";

  async function handleUninstall() {
    try {
      const result = await adminApi.uninstall(phone.pushToken);
      setUninstallNote(result.note);
      onChanged();
    } catch (cause) {
      setUninstallNote(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function act(action: "ack" | "resolve", alarmId: string) {
    if (action === "ack") await phone.acknowledge(alarmId);
    else await phone.resolve(alarmId);
    onChanged();
  }

  return (
    <div className="phone">
      <div className="phone__chrome">
        <div className="phone__notch" />

        <div className="phone__statusbar">
          <span className="mono">{label}</span>
          <span className="phone__signal" data-status={phone.status}>
            <i />
            {phone.status === "online"
              ? "已連線"
              : phone.status === "connecting"
                ? "連線中"
                : phone.status === "offline"
                  ? "離線"
                  : phone.status === "uninstalled"
                    ? "已解除安裝"
                    : "未登入"}
          </span>
        </div>

        <div className="phone__screen" data-state={phone.appState}>
          {!phone.session ? (
            <form
              className="phone__login"
              onSubmit={(event) => {
                event.preventDefault();
                void phone.signIn(chosenEmail, password);
              }}
            >
              <p className="phone__login-title">登入以註冊此裝置</p>

              <select value={chosenEmail} onChange={(event) => setEmail(event.target.value)}>
                {users.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.displayName ?? user.email}
                  </option>
                ))}
              </select>

              <input
                type="password"
                value={password}
                placeholder="密碼 SEED_PASSWORD"
                onChange={(event) => setPassword(event.target.value)}
              />

              <button type="submit" className="btn btn--primary" disabled={phone.busy}>
                {phone.busy ? "登入中…" : "登入並註冊"}
              </button>

              {phone.error ? <p className="phone__error">{phone.error}</p> : null}
            </form>
          ) : (
            <>
              <div className="phone__appbar">
                <span className="truncate">{phone.session.email}</span>

                <div className="phone__appbar-actions">
                  <button
                    type="button"
                    className="phone__tab"
                    data-active={view === "tray" || undefined}
                    onClick={() => setView("tray")}
                  >
                    通知欄
                  </button>
                  <button
                    type="button"
                    className="phone__tab"
                    data-active={view === "inbox" || undefined}
                    onClick={() => {
                      setView("inbox");
                      void phone.refreshAlarms();
                    }}
                  >
                    收件匣
                    {phone.unreadCount > 0 ? (
                      <span className="phone__badge">{phone.unreadCount}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {view === "inbox" ? (
                <Inbox phone={phone} onChanged={onChanged} />
              ) : phone.notifications.length === 0 ? (
                <div className="phone__empty">
                  <p>通知欄沒有新訊息</p>
                  {phone.unreadCount > 0 ? (
                    <button
                      type="button"
                      className="phone__empty-cta"
                      onClick={() => {
                        setView("inbox");
                        void phone.refreshAlarms();
                      }}
                    >
                      但收件匣有 {phone.unreadCount} 則未讀 — 開啟
                    </button>
                  ) : null}
                </div>
              ) : (
                <ul className="phone__tray">
                  {phone.notifications.map((entry) => (
                    <li
                      key={entry.envelope.ticketId}
                      className="notif"
                      data-suppressed={entry.suppressed || undefined}
                      data-opened={entry.openedAt ? true : undefined}
                    >
                      {entry.suppressed ? (
                        <p className="notif__suppressed">
                          系統攔截，使用者從未看到
                          <em>已送達手機，但通知權限被拒</em>
                        </p>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="notif__body"
                            onClick={() => void phone.openNotification(entry.envelope.ticketId)}
                          >
                            <p className="notif__title truncate">{entry.envelope.title}</p>
                            {/* The body already carries the rendered timestamp
                                line, exactly as a lock screen would show it. */}
                            <p className="notif__text">{entry.envelope.body}</p>
                            <p className="notif__meta mono">
                              本機收到 {clockTime(entry.receivedAt)} ·{" "}
                              {entry.envelope.data.alarmId.slice(0, 8)}
                            </p>
                          </button>

                          {entry.openedAt ? (
                            <div className="notif__actions">
                              <button
                                type="button"
                                onClick={() => void act("ack", entry.envelope.alarmId)}
                              >
                                我看到了
                              </button>
                              <button
                                type="button"
                                onClick={() => void act("resolve", entry.envelope.alarmId)}
                              >
                                已處理完
                              </button>
                            </div>
                          ) : (
                            <p className="notif__hint">點擊開啟 → 走認證 API 取得詳情</p>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      <div className="phone__controls">
        <div className="phone__states">
          {APP_STATES.map((state) => (
            <button
              key={state.value}
              type="button"
              data-active={phone.appState === state.value || undefined}
              disabled={!phone.session}
              onClick={() => phone.setAppState(state.value)}
            >
              {state.label}
            </button>
          ))}
        </div>

        <Toggle
          checked={!phone.permissionGranted}
          onChange={(next) => phone.setPermissionGranted(!next)}
          danger
          label="拒絕通知權限"
          hint="Android 13+ POST_NOTIFICATIONS 被拒 → SUPPRESSED"
        />

        {phone.session ? (
          <div className="phone__danger">
            <button type="button" className="btn btn--ghost" onClick={() => void handleUninstall()}>
              模擬解除安裝
            </button>
            <button type="button" className="btn btn--ghost" onClick={phone.signOut}>
              登出
            </button>
          </div>
        ) : null}

        {uninstallNote ? <p className="phone__note">{uninstallNote}</p> : null}

        {phone.session ? (
          <p className="phone__token mono truncate" title={phone.pushToken}>
            <Badge tone="neutral">token</Badge> {phone.pushToken}
          </p>
        ) : null}
      </div>
    </div>
  );
}
