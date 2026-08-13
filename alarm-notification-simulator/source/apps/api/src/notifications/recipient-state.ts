import type { AlarmRecipientState, UndeliverableReason } from "@alarm/contracts";
import type { Db } from "../db/prisma.js";

/**
 * Progress ranking for the recipient ledger.
 *
 * UNDELIVERABLE sits at the bottom with PENDING rather than being terminal: a
 * manager who had no device at alarm time can install the app and acknowledge
 * later, and that later success must be allowed to overwrite the earlier
 * failure. What must NEVER happen is a regression - a late receipt must not
 * knock an already-acknowledged alarm back to DELIVERED.
 */
const RANK: Record<AlarmRecipientState, number> = {
  UNDELIVERABLE: 0,
  PENDING: 0,
  DELIVERED: 1,
  ACKED: 2,
  RESOLVED: 3,
};

export type StateAdvance = {
  state: AlarmRecipientState;
  undeliverableReason?: UndeliverableReason | null;
  deliveredAt?: Date;
  ackedAt?: Date;
  resolvedAt?: Date;
};

/**
 * Moves a recipient forward, never backwards. Returns false when the requested
 * state would be a regression and nothing was written.
 */
export async function advanceRecipientState(
  db: Db,
  alarmId: string,
  userId: string,
  advance: StateAdvance,
): Promise<boolean> {
  const current = await db.alarmRecipient.findUnique({
    where: { alarmId_userId: { alarmId, userId } },
  });

  if (!current) return false;

  const currentState = current.state as AlarmRecipientState;
  const nextRank = RANK[advance.state];
  const currentRank = RANK[currentState] ?? 0;

  // Equal rank is allowed only for the PENDING -> UNDELIVERABLE annotation,
  // which adds a reason without claiming progress.
  const isAnnotation = advance.state === "UNDELIVERABLE" && currentState === "PENDING";

  if (nextRank < currentRank || (nextRank === currentRank && !isAnnotation)) {
    return false;
  }

  await db.alarmRecipient.update({
    where: { alarmId_userId: { alarmId, userId } },
    data: {
      state: advance.state,
      undeliverableReason:
        advance.undeliverableReason === undefined
          ? advance.state === "UNDELIVERABLE"
            ? current.undeliverableReason
            : null
          : advance.undeliverableReason,
      deliveredAt: advance.deliveredAt ?? current.deliveredAt,
      ackedAt: advance.ackedAt ?? current.ackedAt,
      resolvedAt: advance.resolvedAt ?? current.resolvedAt,
    },
  });

  return true;
}
