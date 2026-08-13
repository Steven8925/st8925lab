import type { AlarmDetail, AlarmListItem, AlarmListQuery, AlarmSeverity } from "@alarm/contracts";
import type { Db } from "../db/prisma.js";
import { parseDetails } from "../db/json.js";
import { AppError } from "../lib/errors.js";

type AlarmRow = {
  id: string;
  source: string;
  sourceEventId: string | null;
  dedupKey: string | null;
  severity: string;
  title: string;
  reference: string | null;
  body: string;
  details: string;
  occurredAt: Date;
  createdAt: Date;
  reads: { readAt: Date }[];
  /** The caller's own recipient row, filtered to them by the query. */
  recipients: { deliveredAt: Date | null; ackedAt: Date | null; resolvedAt: Date | null }[];
};

function toListItem(row: AlarmRow): AlarmListItem {
  const mine = row.recipients[0];

  return {
    id: row.id,
    severity: row.severity as AlarmSeverity,
    title: row.title,
    reference: row.reference,
    body: row.body,
    source: row.source,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    readAt: row.reads[0]?.readAt.toISOString() ?? null,
    // Returned so the app can show what the SERVER recorded, not what the app
    // believes it sent. Those disagree exactly when something went wrong.
    deliveredAt: mine?.deliveredAt?.toISOString() ?? null,
    ackedAt: mine?.ackedAt?.toISOString() ?? null,
    resolvedAt: mine?.resolvedAt?.toISOString() ?? null,
  };
}

/**
 * Cursor pagination keyed on (createdAt, id). Offset pagination would skip or
 * repeat rows whenever a new alarm arrives between two page requests - which,
 * for an alarm feed, is the normal case rather than the edge case.
 */
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.getTime()}:${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) throw AppError.badRequest("cursor is malformed");

  const millis = Number(decoded.slice(0, separator));
  const id = decoded.slice(separator + 1);
  if (!Number.isFinite(millis) || id.length === 0) {
    throw AppError.badRequest("cursor is malformed");
  }
  return { createdAt: new Date(millis), id };
}

export async function listAlarmsForUser(
  db: Db,
  userId: string,
  query: AlarmListQuery,
): Promise<{ items: AlarmListItem[]; nextCursor: string | null }> {
  const filters: Record<string, unknown>[] = [
    { recipients: { some: { userId } } },
  ];

  if (query.status === "unread") {
    filters.push({ reads: { none: { userId } } });
  }

  if (query.severity) {
    filters.push({ severity: query.severity });
  }

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    filters.push({
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
    });
  }

  const rows = await db.alarm.findMany({
    where: { AND: filters },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    // One extra row tells us whether another page exists without a COUNT query.
    take: query.limit + 1,
    include: {
      reads: { where: { userId }, select: { readAt: true } },
      recipients: {
        where: { userId },
        select: { deliveredAt: true, ackedAt: true, resolvedAt: true },
      },
    },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page.at(-1);

  return {
    items: page.map(toListItem),
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

/**
 * Returns null for both "no such alarm" and "not one of your alarms". The route
 * turns both into 404 so the API never confirms that another user's alarm
 * exists (README.md §7.3).
 */
export async function getAlarmForUser(
  db: Db,
  userId: string,
  alarmId: string,
): Promise<AlarmDetail | null> {
  const row = await db.alarm.findFirst({
    where: { id: alarmId, recipients: { some: { userId } } },
    include: {
      reads: { where: { userId }, select: { readAt: true } },
      recipients: {
        where: { userId },
        select: { deliveredAt: true, ackedAt: true, resolvedAt: true },
      },
    },
  });

  if (!row) return null;

  return {
    ...toListItem(row),
    sourceEventId: row.sourceEventId,
    dedupKey: row.dedupKey,
    details: parseDetails(row.details),
  };
}

export function countUnreadForUser(db: Db, userId: string): Promise<number> {
  return db.alarm.count({
    where: {
      recipients: { some: { userId } },
      reads: { none: { userId } },
    },
  });
}

export async function markAlarmRead(
  db: Db,
  userId: string,
  alarmId: string,
): Promise<{
  alarmId: string;
  readAt: string;
  alreadyRead: boolean;
  /** Returned so the event stream can name the alarm rather than its UUID. */
  title: string;
  reference: string | null;
}> {
  const recipient = await db.alarmRecipient.findUnique({
    where: { alarmId_userId: { alarmId, userId } },
    include: { alarm: { select: { title: true, reference: true } } },
  });

  if (!recipient) {
    throw AppError.notFound("Alarm not found");
  }

  const { title, reference } = recipient.alarm;

  const existing = await db.alarmRead.findUnique({
    where: { alarmId_userId: { alarmId, userId } },
  });

  // Idempotent: marking an already-read alarm keeps the original timestamp
  // rather than moving it, so "when did the manager first see this" stays true.
  if (existing) {
    return {
      alarmId,
      readAt: existing.readAt.toISOString(),
      alreadyRead: true,
      title,
      reference,
    };
  }

  const created = await db.alarmRead.create({ data: { alarmId, userId } });
  return {
    alarmId,
    readAt: created.readAt.toISOString(),
    alreadyRead: false,
    title,
    reference,
  };
}
