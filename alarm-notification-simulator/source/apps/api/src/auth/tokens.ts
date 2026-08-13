import crypto from "node:crypto";
import { config } from "../config.js";
import type { Db } from "../db/prisma.js";
import { parseDuration } from "../lib/duration.js";

export const REFRESH_TTL_MS = parseDuration(config.JWT_REFRESH_TTL);

/**
 * Refresh tokens are stored as SHA-256 hashes. A database leak therefore does
 * not hand an attacker usable sessions. SHA-256 (not Argon2) is correct here:
 * the token is 48 bytes of CSPRNG output, so there is no low-entropy secret to
 * slow-hash and login latency matters.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export async function issueRefreshToken(db: Db, userId: string): Promise<string> {
  const token = generateRefreshToken();
  await db.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return token;
}

export type RefreshTokenLookup =
  | { ok: true; userId: string; id: string }
  | { ok: false; reason: "not_found" | "revoked" | "expired" };

export async function lookupRefreshToken(db: Db, token: string): Promise<RefreshTokenLookup> {
  const record = await db.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
  });

  if (!record) return { ok: false, reason: "not_found" };
  if (record.revokedAt) return { ok: false, reason: "revoked" };
  if (record.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, userId: record.userId, id: record.id };
}

export async function revokeRefreshToken(db: Db, token: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Rotation: the presented token is revoked and a fresh one issued. A stolen
 * refresh token is therefore usable at most once before the real user's next
 * refresh invalidates it.
 */
export async function rotateRefreshToken(db: Db, oldToken: string, userId: string): Promise<string> {
  await revokeRefreshToken(db, oldToken);
  return issueRefreshToken(db, userId);
}
