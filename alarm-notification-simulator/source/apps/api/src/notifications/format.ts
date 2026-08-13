/**
 * Renders the timestamps that must appear inside every notification.
 *
 * Two times matter to a manager reading an alarm on a lock screen:
 *   occurred - when the condition actually happened
 *   sent     - when we tried to tell them
 *
 * A large gap between the two is itself the diagnosis: it means the source
 * system was slow, the poll interval was long, or the alarm sat queued. With
 * only one timestamp that gap is invisible.
 */

/**
 * The zone label is ALWAYS included.
 *
 * An alarm timestamp with no zone is worse than no timestamp: the reader assumes
 * their own zone and can be hours wrong about whether a tank is boiling right
 * now or was boiling last night. Rendering in the device's own zone when it is
 * known removes the mental arithmetic; stating the zone removes the ambiguity
 * when it is not.
 */
function parts(at: Date, timeZone: string | undefined) {
  const options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
    ...(timeZone ? { timeZone } : {}),
  };

  try {
    return new Intl.DateTimeFormat("zh-TW", options).formatToParts(at);
  } catch {
    // An unknown or malformed device timezone must not break the notification.
    // Falling back to the server zone loses precision, never the alarm.
    delete options.timeZone;
    return new Intl.DateTimeFormat("zh-TW", options).formatToParts(at);
  }
}

function pick(list: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return list.find((part) => part.type === type)?.value ?? "";
}

function stamp(at: Date, timeZone: string | undefined): { text: string; zone: string } {
  const list = parts(at, timeZone);
  return {
    text: `${pick(list, "month")}/${pick(list, "day")} ${pick(list, "hour")}:${pick(list, "minute")}:${pick(list, "second")}`,
    zone: pick(list, "timeZoneName"),
  };
}

export type NotificationTimestamps = {
  occurredAt: Date;
  sentAt: Date;
  /** The device's IANA timezone, when it reported one at registration. */
  timeZone?: string | null;
};

/** One compact line, e.g. `發生 08/13 15:04:12 ｜ 發送 08/13 15:04:17 ｜ GMT+8`. */
export function formatTimestampLine(input: NotificationTimestamps): string {
  const zone = input.timeZone ?? undefined;
  const occurred = stamp(input.occurredAt, zone);
  const sent = stamp(input.sentAt, zone);

  return `發生 ${occurred.text} ｜ 發送 ${sent.text} ｜ ${sent.zone}`;
}

/**
 * The push body: the alarm text, then the timestamp line.
 *
 * The times are baked into the visible text rather than left as structured
 * fields alone, because that is the only form guaranteed to survive every
 * transport - a lock-screen banner renders the body and nothing else.
 */
export function buildPushBody(alarmBody: string, timestamps: NotificationTimestamps): string {
  return `${alarmBody}\n${formatTimestampLine(timestamps)}`;
}
