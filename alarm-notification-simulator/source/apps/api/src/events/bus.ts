import crypto from "node:crypto";
import type { ServerEvent, ServerEventName } from "@alarm/contracts";
import { logger } from "../logger.js";

export type EmitEventInput = Omit<ServerEvent, "id" | "at"> & { at?: string };

type Subscriber = (event: ServerEvent) => void;

/**
 * In-process fan-out of the server events listed in README.md §14.1.
 *
 * The same event object is written to the structured log and pushed to the
 * admin SSE stream, so the middle pane of the simulation page shows exactly
 * what was logged rather than a parallel, prettier story.
 */
class ServerEventBus {
  private readonly subscribers = new Set<Subscriber>();
  private readonly buffer: ServerEvent[] = [];
  private readonly bufferLimit = 300;

  emit(input: EmitEventInput): ServerEvent {
    const event: ServerEvent = {
      ...input,
      id: crypto.randomUUID(),
      at: input.at ?? new Date().toISOString(),
    };

    this.buffer.push(event);
    if (this.buffer.length > this.bufferLimit) {
      this.buffer.splice(0, this.buffer.length - this.bufferLimit);
    }

    logger.info(
      {
        event: event.event,
        requestId: event.requestId,
        alarmId: event.alarmId,
        deviceId: event.deviceId,
        userId: event.userId,
        source: event.source,
        ...event.context,
      },
      event.message,
    );

    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch (error) {
        // One broken SSE connection must not stop the alarm pipeline.
        logger.warn({ err: error }, "Server event subscriber threw");
      }
    }

    return event;
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /** Replayed to a newly connected console so it does not start blank. */
  recent(limit = 100): ServerEvent[] {
    return this.buffer.slice(-limit);
  }

  clear(): void {
    this.buffer.length = 0;
  }
}

export const serverEvents = new ServerEventBus();
export type { ServerEventName };
