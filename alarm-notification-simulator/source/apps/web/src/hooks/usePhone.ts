import { useCallback, useEffect, useRef, useState } from "react";
import {
  makeSimulatorPushToken,
  SIMULATOR_WS_PATH,
  type AlarmListItem,
  type SimulatedAppState,
  type SimulatorPushEnvelope,
  type SimulatorServerMessage,
} from "@alarm/contracts";
import { API_BASE, phoneApi } from "../api/client.js";

export type PhoneNotification = {
  envelope: SimulatorPushEnvelope;
  receivedAt: string;
  /** The handset acknowledged receipt back to the server. */
  acked: boolean;
  /** The OS refused to display it — arrived, but never seen. */
  suppressed: boolean;
  openedAt: string | null;
};

export type PhoneSession = {
  accessToken: string;
  email: string;
  userId: string;
  deviceId: string;
};

export type PhoneStatus = "signed-out" | "connecting" | "online" | "offline" | "uninstalled";

export type UsePhoneResult = {
  status: PhoneStatus;
  session: PhoneSession | null;
  pushToken: string;
  notifications: PhoneNotification[];
  /**
   * The authoritative alarm list, fetched from the API.
   *
   * Distinct from `notifications`, which only holds pushes that arrived over
   * this socket. A dropped push, a phone that was switched off, or a page reload
   * leaves the tray empty while these are still waiting - which is exactly why
   * the database, not the push, is the source of truth.
   */
  alarms: AlarmListItem[];
  alarmsLoading: boolean;
  appState: SimulatedAppState;
  unreadCount: number;
  error: string | null;
  busy: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  setAppState: (state: SimulatedAppState) => void;
  /** When true the simulated OS refuses to display pushes (Android 13+ denial). */
  setPermissionGranted: (granted: boolean) => void;
  permissionGranted: boolean;
  openNotification: (ticketId: string) => Promise<void>;
  openAlarm: (alarmId: string) => Promise<void>;
  acknowledge: (alarmId: string) => Promise<void>;
  resolve: (alarmId: string) => Promise<void>;
  refreshUnread: () => Promise<void>;
  /** Re-reads the list from the API. Runs on sign-in and on every foreground. */
  refreshAlarms: () => Promise<void>;
};

/**
 * One simulated handset: a real login, a real device registration, and a real
 * WebSocket carrying real push envelopes.
 *
 * The parts that are genuinely simulated are the OS behaviours - app state,
 * notification permission, uninstall - because those are what change how a
 * correct server must behave and they cannot otherwise be demonstrated.
 */
export function usePhone(label: string): UsePhoneResult {
  const [session, setSession] = useState<PhoneSession | null>(null);
  const [status, setStatus] = useState<PhoneStatus>("signed-out");
  const [notifications, setNotifications] = useState<PhoneNotification[]>([]);
  const [alarms, setAlarms] = useState<AlarmListItem[]>([]);
  const [alarmsLoading, setAlarmsLoading] = useState(false);
  const [appState, setAppStateInternal] = useState<SimulatedAppState>("TERMINATED");
  const [permissionGranted, setPermissionGranted] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const permissionRef = useRef(permissionGranted);
  permissionRef.current = permissionGranted;

  const pushToken = makeSimulatorPushToken(label);

  const send = useCallback((payload: unknown) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!session) return;
    try {
      const result = await phoneApi.unreadCount(session.accessToken);
      setUnreadCount(result.unreadCount);
    } catch {
      // A failed badge refresh must not break the handset.
    }
  }, [session]);

  /**
   * Fetches the alarm list from the API.
   *
   * This is the mechanism that makes a dropped push survivable: the tray only
   * holds what arrived over the socket, but this list is the database's own
   * answer to "what is waiting for this person".
   */
  const refreshAlarms = useCallback(async () => {
    if (!session) return;
    setAlarmsLoading(true);
    try {
      const result = await phoneApi.listAlarms(session.accessToken);
      setAlarms(result.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setAlarmsLoading(false);
    }
  }, [session]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      setError(null);
      try {
        const auth = await phoneApi.login(email, password);
        const device = await phoneApi.registerDevice(auth.accessToken, {
          pushToken,
          platform: "simulator",
          label,
          /**
           * Reported so the server can render alarm times in THIS handset's
           * zone. A timestamp without a zone lets the reader be hours wrong
           * about whether a condition is happening now or happened overnight.
           */
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
        });

        setSession({
          accessToken: auth.accessToken,
          email: auth.user.email,
          userId: auth.user.id,
          deviceId: device.id,
        });
        setAppStateInternal("BACKGROUND");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("signed-out");
      } finally {
        setBusy(false);
      }
    },
    [label, pushToken],
  );

  const signOut = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setSession(null);
    setStatus("signed-out");
    setNotifications([]);
    setAlarms([]);
    setUnreadCount(0);
    setAppStateInternal("TERMINATED");
  }, []);

  // Connect once signed in. The socket is the transport; losing it is exactly
  // the "phone is switched off" case the server must tolerate.
  useEffect(() => {
    if (!session) return;

    setStatus("connecting");
    const wsBase = API_BASE.replace(/^http/, "ws");
    const socket = new WebSocket(
      `${wsBase}${SIMULATOR_WS_PATH}?token=${encodeURIComponent(pushToken)}`,
    );
    socketRef.current = socket;

    socket.onopen = () => setStatus("online");
    socket.onclose = () => setStatus((current) => (current === "uninstalled" ? current : "offline"));
    socket.onerror = () => setError("WebSocket 連線失敗 / WebSocket connection failed");

    socket.onmessage = (message) => {
      let parsed: SimulatorServerMessage;
      try {
        parsed = JSON.parse(message.data as string) as SimulatorServerMessage;
      } catch {
        return;
      }

      if (parsed.type === "error") {
        setError(`${parsed.code}: ${parsed.message}`);
        return;
      }

      if (parsed.type !== "push") return;

      const suppressed = !permissionRef.current;

      setNotifications((previous) => [
        {
          envelope: parsed.envelope,
          receivedAt: new Date().toISOString(),
          acked: !suppressed,
          suppressed,
          openedAt: null,
        },
        ...previous,
      ]);

      /**
       * The reply distinguishes "arrived and shown" from "arrived and the OS
       * refused to show it". Reporting the second as a plain acknowledgement
       * would tell the server a human saw something nobody saw.
       */
      if (suppressed) {
        socket.send(
          JSON.stringify({
            type: "suppressed",
            ticketId: parsed.envelope.ticketId,
            reason: "PERMISSION_DENIED",
          }),
        );
      } else {
        socket.send(JSON.stringify({ type: "ack", ticketId: parsed.envelope.ticketId }));
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [session, pushToken]);

  // The server tracks app state so the console can show what a real OS would
  // have done with the notification.
  useEffect(() => {
    if (status === "online") send({ type: "state", state: appState });
  }, [appState, status, send]);

  useEffect(() => {
    if (status === "online") void refreshUnread();
  }, [status, refreshUnread]);

  /**
   * Refetch on connect and on every return to the foreground.
   *
   * This is the project's first design rule in practice: push is a hint, so the
   * app asks the database what is actually waiting rather than trusting that
   * every notification arrived.
   */
  useEffect(() => {
    if (status !== "online") return;
    if (appState === "FOREGROUND" || alarms.length === 0) {
      void refreshAlarms();
      void refreshUnread();
    }
    // Intentionally not depending on `alarms`: this must run on state changes,
    // not re-run every time the list it fetches is replaced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, appState, refreshAlarms, refreshUnread]);

  const setAppState = useCallback((next: SimulatedAppState) => {
    setAppStateInternal(next);
  }, []);

  /** Opening an alarm: fetch the protected detail, then mark it read. */
  const openAlarm = useCallback(
    async (alarmId: string) => {
      if (!session) return;
      try {
        // The payload carried only an id; the content comes from the
        // authenticated API. This call is the proof of that design.
        await phoneApi.getAlarm(session.accessToken, alarmId);
        await phoneApi.markRead(session.accessToken, alarmId);
        await refreshUnread();
        await refreshAlarms();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
    [session, refreshUnread, refreshAlarms],
  );

  const openNotification = useCallback(
    async (ticketId: string) => {
      const target = notifications.find((entry) => entry.envelope.ticketId === ticketId);
      if (!target) return;

      setNotifications((previous) =>
        previous.map((entry) =>
          entry.envelope.ticketId === ticketId
            ? { ...entry, openedAt: new Date().toISOString() }
            : entry,
        ),
      );

      await openAlarm(target.envelope.alarmId);
    },
    [notifications, openAlarm],
  );

  const acknowledge = useCallback(
    async (alarmId: string) => {
      if (!session) return;
      try {
        await phoneApi.acknowledge(session.accessToken, alarmId);
        await refreshAlarms();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
    [session, refreshAlarms],
  );

  const resolve = useCallback(
    async (alarmId: string) => {
      if (!session) return;
      try {
        await phoneApi.resolve(session.accessToken, alarmId);
        await refreshAlarms();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
    [session, refreshAlarms],
  );

  return {
    status,
    session,
    pushToken,
    notifications,
    alarms,
    alarmsLoading,
    appState,
    unreadCount,
    error,
    busy,
    signIn,
    signOut,
    setAppState,
    setPermissionGranted,
    permissionGranted,
    openNotification,
    openAlarm,
    acknowledge,
    resolve,
    refreshUnread,
    refreshAlarms,
  };
}
