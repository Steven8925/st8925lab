const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parses the compact duration strings used for token lifetimes ("15m", "30d").
 * Deliberately strict: a typo in JWT_REFRESH_TTL should fail at startup, not
 * silently produce a token that expires in 1970.
 */
export function parseDuration(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration "${value}". Expected a number followed by s, m, h or d (e.g. "15m", "30d").`);
  }
  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof UNIT_MS;
  const multiplier = UNIT_MS[unit];
  if (multiplier === undefined) {
    throw new Error(`Invalid duration unit in "${value}".`);
  }
  return amount * multiplier;
}
