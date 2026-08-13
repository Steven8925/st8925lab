import crypto from "node:crypto";
import type { WebhookDispatch } from "./webhook-client.js";

/** What the notification API did with an event this server raised. */
export type OpsOutcome =
  | "ACCEPTED"
  | "DUPLICATE"
  | "REJECTED"
  | "PARTIAL"
  | "NO_RECIPIENTS"
  | "TRANSPORT_ERROR";

export type OpsEventRecord = {
  id: string;
  at: string;
  scenarioId: string;
  scenarioLabel: string;
  severity: string;
  title: string;
  eventId: string;
  dedupKey: string | null;
  format: string;
  signatureMode: string;
  outcome: OpsOutcome;
  /** Alarm id assigned by the notification API, when one was created. */
  alarmId: string | null;
  /**
   * The quotable alarm code the notification API issued, e.g.
   * `TANK01-20260813-07`.
   *
   * Recorded on THIS side deliberately. The operations team and the notification
   * team otherwise hold two logs with no shared name for the same alarm, and
   * correlating an incident afterwards means joining them by timestamp.
   */
  reference: string | null;
  httpStatus: number | null;
  /** One-line explanation for the console. */
  note: string;
  dispatch: WebhookDispatch;
};

/**
 * This server's own record of every alarm it raised.
 *
 * The operations side must be able to answer "what did we send, and what did
 * they say" independently of the notification system's database. If the only
 * record lived downstream, a rejected webhook would leave no trace anywhere the
 * operations team can see - which is exactly the failure this log prevents.
 */
export class OpsEventLog {
  private readonly records: OpsEventRecord[] = [];
  private readonly limit = 500;
  private readonly listeners = new Set<(record: OpsEventRecord) => void>();

  add(record: Omit<OpsEventRecord, "id" | "at">): OpsEventRecord {
    const full: OpsEventRecord = {
      ...record,
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
    };

    this.records.push(full);
    if (this.records.length > this.limit) {
      this.records.splice(0, this.records.length - this.limit);
    }

    for (const listener of this.listeners) {
      try {
        listener(full);
      } catch {
        // A broken console subscriber must not break event raising.
      }
    }

    return full;
  }

  list(limit = 100): OpsEventRecord[] {
    return this.records.slice(-limit).reverse();
  }

  subscribe(listener: (record: OpsEventRecord) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  stats() {
    const byOutcome: Record<string, number> = {};
    for (const record of this.records) {
      byOutcome[record.outcome] = (byOutcome[record.outcome] ?? 0) + 1;
    }
    return { total: this.records.length, byOutcome };
  }

  clear(): void {
    this.records.length = 0;
  }
}

/** Classifies the notification API's response into an operator-facing outcome. */
export function classifyOutcome(dispatch: WebhookDispatch): {
  outcome: OpsOutcome;
  note: string;
  alarmId: string | null;
  reference: string | null;
} {
  if (dispatch.transportError) {
    return {
      outcome: "TRANSPORT_ERROR",
      note: `無法連線到通知服務：${dispatch.transportError}`,
      alarmId: null,
      reference: null,
    };
  }

  const body = dispatch.responseBody as
    | {
        data?: {
          alarmId?: string;
          reference?: string | null;
          duplicate?: boolean;
          recipientCount?: number;
          unresolvedRecipients?: { identifier: string; reason: string }[];
        };
        error?: { code?: string; message?: string };
      }
    | undefined;

  if (dispatch.status !== 200) {
    const code = body?.error?.code ?? "UNKNOWN";
    return {
      outcome: "REJECTED",
      note: `通知服務拒絕此事件（HTTP ${dispatch.status}，${code}）：${body?.error?.message ?? ""}`.trim(),
      alarmId: null,
      // A rejected event was never stored, so it was never numbered. Showing a
      // code here would imply a record downstream that does not exist.
      reference: null,
    };
  }

  const data = body?.data;
  const alarmId = data?.alarmId ?? null;
  const reference = data?.reference ?? null;
  /**
   * The lead-in phrase: `告警` alone, or `告警 <code> ` when a code exists.
   *
   * THE TRAILING SPACE IS PART OF THE PHRASE. Interpolating `reference ?? ""`
   * instead leaves a double space when there is no code, and appending a space
   * at the use site leaves `告警 已建立` when there is none - both read as
   * though a word went missing.
   */
  const lead = reference ? `告警 ${reference} ` : "告警";
  const unresolved = data?.unresolvedRecipients ?? [];

  if (data?.duplicate) {
    return {
      outcome: "DUPLICATE",
      note: reference
        ? `已被判定為重複事件，未重複通知任何人（原告警 ${reference}）。`
        : "已被判定為重複事件，未重複通知任何人。",
      alarmId,
      reference,
    };
  }

  if ((data?.recipientCount ?? 0) === 0) {
    return {
      outcome: "NO_RECIPIENTS",
      note: `${lead}已建立，但沒有任何收件人可通知（${unresolved.length} 位無法對應）。`,
      alarmId,
      reference,
    };
  }

  if (unresolved.length > 0) {
    return {
      outcome: "PARTIAL",
      note: `已送出給 ${data?.recipientCount} 位收件人；${unresolved
        .map((entry) => `${entry.identifier}（${entry.reason}）`)
        .join("、")} 無法對應。`,
      alarmId,
      reference,
    };
  }

  return {
    outcome: "ACCEPTED",
    note: `${lead}已建立並派送給 ${data?.recipientCount} 位收件人。`,
    alarmId,
    reference,
  };
}
