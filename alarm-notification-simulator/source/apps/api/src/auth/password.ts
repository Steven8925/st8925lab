import { hash, verify } from "@node-rs/argon2";

/**
 * @node-rs/argon2 exports `Algorithm` as an ambient const enum, which cannot be
 * imported when verbatimModuleSyntax is on. Argon2id is value 2 and is the
 * variant the library documents as the normative recommendation.
 */
const ALGORITHM_ARGON2ID = 2;

/**
 * OWASP Password Storage Cheat Sheet baseline for Argon2id: 19 MiB memory,
 * 2 iterations, parallelism 1.
 */
const ARGON2_OPTIONS = {
  algorithm: ALGORITHM_ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain, ARGON2_OPTIONS);
  } catch {
    // A corrupt or foreign-format hash must read as "wrong password", never as
    // a 500 that tells an attacker the account exists.
    return false;
  }
}
