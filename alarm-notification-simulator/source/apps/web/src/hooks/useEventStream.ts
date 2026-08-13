import { useEffect, useRef, useState } from "react";
import type { ServerEvent } from "@alarm/contracts";

export type StreamStatus = "connecting" | "open" | "closed";

/**
 * Subscribes to a server-sent event stream.
 *
 * EventSource reconnects on its own, so no retry logic is implemented here -
 * hand-rolling one on top would produce two competing reconnect loops. The
 * status is surfaced instead, because an operator watching a demo needs to be
 * able to tell "nothing is happening" from "the console lost its connection".
 */
export function useEventStream<T = ServerEvent>(
  url: string,
  options: { limit?: number } = {},
): { events: T[]; status: StreamStatus; clear: () => void } {
  const limit = options.limit ?? 400;
  const [events, setEvents] = useState<T[]>([]);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const limitRef = useRef(limit);
  limitRef.current = limit;

  useEffect(() => {
    setStatus("connecting");
    const source = new EventSource(url);

    source.onopen = () => setStatus("open");

    source.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data) as T;
        setEvents((previous) => {
          const next = [...previous, parsed];
          return next.length > limitRef.current
            ? next.slice(next.length - limitRef.current)
            : next;
        });
      } catch {
        // A malformed frame must not tear down a working stream.
      }
    };

    source.onerror = () => {
      // EventSource fires onerror both for a transient drop it will retry and
      // for a permanent failure; CLOSED is the only reliable distinction.
      setStatus(source.readyState === EventSource.CLOSED ? "closed" : "connecting");
    };

    return () => source.close();
  }, [url]);

  return { events, status, clear: () => setEvents([]) };
}
