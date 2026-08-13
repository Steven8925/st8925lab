import crypto from "node:crypto";
import type {
  SimulatedAppState,
  SimulatorPushEnvelope,
  SimulatorServerMessage,
} from "@alarm/contracts";

type Connection = {
  token: string;
  send: (message: SimulatorServerMessage) => void;
};

export type TicketRecord = {
  ticketId: string;
  token: string;
  envelope: SimulatorPushEnvelope;
  createdAt: Date;
  /** Set when the simulated handset echoed an acknowledgement back. */
  deviceConfirmedAt: Date | null;
  /** Set when the handset reported the OS refused to display it. */
  suppressedReason: string | null;
};

export type HubEvent =
  | { type: "device_connected"; token: string }
  | { type: "device_disconnected"; token: string }
  | { type: "device_uninstalled"; token: string }
  | { type: "device_confirmed"; token: string; ticketId: string }
  | { type: "device_suppressed"; token: string; ticketId: string; reason: string }
  | { type: "device_state"; token: string; state: SimulatedAppState }
  | { type: "queue_flushed"; token: string; count: number };

/**
 * The simulated device transport.
 *
 * Deliberately models the parts of FCM/APNs behaviour that change how a correct
 * server must be written:
 *   * store-and-forward - a push sent to a disconnected device is queued and
 *     delivered on reconnect, so "no acknowledgement yet" never proves loss.
 *   * accept-then-fail  - enqueue() succeeds even for a dead token; the failure
 *     surfaces only in the later receipt, exactly how DeviceNotRegistered
 *     reaches a real server.
 *
 * It does NOT model OEM battery managers killing the app, iOS silent-push
 * throttling, or carrier delay. Those are real and cannot be reproduced here -
 * which is precisely why the production system must never treat a missing
 * acknowledgement as proof of non-delivery.
 */
export class SimulatorDeviceHub {
  private readonly connections = new Map<string, Connection>();
  private readonly queues = new Map<string, SimulatorServerMessage[]>();
  private readonly tickets = new Map<string, TicketRecord>();
  private readonly uninstalled = new Set<string>();
  private readonly appStates = new Map<string, SimulatedAppState>();
  private readonly listeners = new Set<(event: HubEvent) => void>();

  connect(
    token: string,
    deviceId: string,
    send: (message: SimulatorServerMessage) => void,
  ): () => void {
    // One connection per token. A reconnect replaces the stale socket instead of
    // accumulating ghosts that would each deliver their own copy.
    const previous = this.connections.get(token);
    if (previous) {
      previous.send({ type: "error", code: "REPLACED", message: "Replaced by a newer connection" });
    }

    this.connections.set(token, { token, send });
    this.uninstalled.delete(token);
    send({ type: "registered", deviceId, pushToken: token });
    this.emit({ type: "device_connected", token });

    const queued = this.queues.get(token) ?? [];
    this.queues.delete(token);
    for (const message of queued) {
      send(message);
    }
    if (queued.length > 0) {
      this.emit({ type: "queue_flushed", token, count: queued.length });
    }

    return () => {
      if (this.connections.get(token)?.send === send) {
        this.connections.delete(token);
        this.emit({ type: "device_disconnected", token });
      }
    };
  }

  isConnected(token: string): boolean {
    return this.connections.has(token);
  }

  /** Simulates uninstalling the app. The token stays dead until re-registered. */
  uninstall(token: string): void {
    const connection = this.connections.get(token);
    connection?.send({ type: "error", code: "UNINSTALLED", message: "App was uninstalled" });
    this.connections.delete(token);
    this.queues.delete(token);
    this.uninstalled.add(token);
    this.emit({ type: "device_uninstalled", token });
  }

  isUninstalled(token: string): boolean {
    return this.uninstalled.has(token);
  }

  setAppState(token: string, state: SimulatedAppState): void {
    this.appStates.set(token, state);
    this.emit({ type: "device_state", token, state });
  }

  getAppState(token: string): SimulatedAppState {
    return this.appStates.get(token) ?? "TERMINATED";
  }

  /**
   * Accepts a push for delivery and returns its ticket id.
   *
   * Returns a ticket even when the token is dead: the provider reports that
   * failure through the receipt, never through send(), mirroring Expo and FCM.
   */
  enqueue(token: string, envelope: Omit<SimulatorPushEnvelope, "ticketId">): string {
    const ticketId = crypto.randomUUID();
    const full: SimulatorPushEnvelope = { ...envelope, ticketId };

    this.tickets.set(ticketId, {
      ticketId,
      token,
      envelope: full,
      createdAt: new Date(),
      deviceConfirmedAt: null,
      suppressedReason: null,
    });

    if (this.uninstalled.has(token)) {
      // Silently dropped, exactly like a push to an uninstalled app.
      return ticketId;
    }

    const message: SimulatorServerMessage = { type: "push", envelope: full };
    const connection = this.connections.get(token);

    if (connection) {
      connection.send(message);
    } else {
      const queue = this.queues.get(token) ?? [];
      queue.push(message);
      this.queues.set(token, queue);
    }

    return ticketId;
  }

  /** The handset echoed back that it received the push. */
  confirmDelivery(ticketId: string): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket || ticket.deviceConfirmedAt) return false;

    ticket.deviceConfirmedAt = new Date();
    this.emit({ type: "device_confirmed", token: ticket.token, ticketId });
    return true;
  }

  /** The push arrived but the OS refused to display it. */
  markSuppressed(ticketId: string, reason: string): boolean {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return false;

    // Arrival is still proven - the device had to receive it to report this.
    ticket.deviceConfirmedAt ??= new Date();
    ticket.suppressedReason = reason;
    this.emit({ type: "device_suppressed", token: ticket.token, ticketId, reason });
    return true;
  }

  getTicket(ticketId: string): TicketRecord | undefined {
    return this.tickets.get(ticketId);
  }

  queueDepth(token: string): number {
    return this.queues.get(token)?.length ?? 0;
  }

  /**
   * Reads the store-and-forward queue WITHOUT draining it.
   *
   * This is the queue of pushes accepted for a device that was not connected -
   * the concrete reason a missing acknowledgement is never proof of loss. It is
   * distinct from the recipient's unread count: this holds messages that have
   * not yet reached the handset at all, whereas unread alarms have been stored
   * and are waiting to be looked at.
   *
   * Returns copies so a console cannot mutate delivery state by inspecting it.
   */
  peekQueue(token: string): SimulatorPushEnvelope[] {
    const queued = this.queues.get(token) ?? [];

    return queued
      .filter((message): message is Extract<SimulatorServerMessage, { type: "push" }> =>
        message.type === "push",
      )
      .map((message) => ({ ...message.envelope }));
  }

  /** Every token that currently has undelivered pushes waiting. */
  queuedTokens(): { token: string; depth: number }[] {
    return [...this.queues.entries()]
      .map(([token, messages]) => ({ token, depth: messages.length }))
      .filter((entry) => entry.depth > 0);
  }

  subscribe(listener: (event: HubEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: HubEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Test isolation only. */
  reset(): void {
    this.connections.clear();
    this.queues.clear();
    this.tickets.clear();
    this.uninstalled.clear();
    this.appStates.clear();
  }
}
