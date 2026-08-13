import type { SensorLevel } from "./sensors.js";

/**
 * One row in the customer's alarm table.
 *
 * This shape belongs to the CUSTOMER, not to us. It is deliberately not exported
 * through @alarm/contracts: in production the notification service learns this
 * shape only inside its source adapter, because it is somebody else's schema and
 * can change without our agreement.
 */
export type SourceAlarmEvent = {
  /** Stable primary key. This is what anchors deduplication layer 1. */
  id: number;
  deviceId: string;
  metric: string;
  metricLabel: string;
  value: number;
  unit: string;
  level: Exclude<SensorLevel, "NORMAL">;
  threshold: number;
  /** Text the customer's system composed when the condition was met. */
  message: string;
  createdAt: string;
  /** 1 = awaiting pickup, 2 = the notification program has taken it. */
  flag: 1 | 2;
  pickedUpAt: string | null;
};

/**
 * The customer's alarm table, simulated in memory.
 *
 * PRODUCTION NOTE: the real equivalent is a table in the customer's database and
 * the notification service reads it with a cursor-based query, never writing to
 * it. The flag transition modelled here belongs to the CUSTOMER's side - it is
 * included so the handoff moment is visible in the console, not because our
 * service should be updating somebody else's rows.
 *
 * Why our service must not own that flag: if a send reaches two of three
 * recipients, no single flag value is correct. Delivery state belongs in our own
 * per-recipient ledger, which already records it.
 */
export class SourceEventStore {
  private readonly rows: SourceAlarmEvent[] = [];
  private nextId = 1;
  private readonly limit = 500;
  private readonly listeners = new Set<(row: SourceAlarmEvent) => void>();

  insert(input: Omit<SourceAlarmEvent, "id" | "createdAt" | "flag" | "pickedUpAt">): SourceAlarmEvent {
    const row: SourceAlarmEvent = {
      ...input,
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      flag: 1,
      pickedUpAt: null,
    };

    this.rows.push(row);
    if (this.rows.length > this.limit) {
      this.rows.splice(0, this.rows.length - this.limit);
    }

    for (const listener of this.listeners) {
      try {
        listener(row);
      } catch {
        // A broken console subscriber must not stop alarm generation.
      }
    }

    return row;
  }

  /**
   * Hands over every row still awaiting pickup and marks it taken.
   *
   * Returning the rows and marking them in one step is what makes this
   * at-least-once rather than at-most-once: if the caller crashes after this
   * returns, those rows are already flagged and will not be re-read - so the
   * notification service's own deduplication, not this flag, is what guarantees
   * no duplicate alarm. That is the correct place for the guarantee, because the
   * customer's flag is not under our control in production.
   */
  claimPending(): SourceAlarmEvent[] {
    const pending = this.rows.filter((row) => row.flag === 1);
    const at = new Date().toISOString();

    for (const row of pending) {
      row.flag = 2;
      row.pickedUpAt = at;
    }

    return pending.map((row) => ({ ...row }));
  }

  list(limit = 60): SourceAlarmEvent[] {
    return this.rows.slice(-limit).reverse();
  }

  stats() {
    return {
      total: this.rows.length,
      pending: this.rows.filter((row) => row.flag === 1).length,
      pickedUp: this.rows.filter((row) => row.flag === 2).length,
    };
  }

  subscribe(listener: (row: SourceAlarmEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear(): void {
    this.rows.length = 0;
    this.nextId = 1;
  }
}
