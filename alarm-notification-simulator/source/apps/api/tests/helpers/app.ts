import { INTERNAL_WEBHOOK_SIGNATURE_HEADER } from "@alarm/contracts";
import { hashPassword } from "../../src/auth/password.js";
import { config } from "../../src/config.js";
import type { Db } from "../../src/db/prisma.js";
import type { PushDispatcher } from "../../src/notifications/dispatcher.js";
import { buildServer } from "../../src/server.js";
import { computeWebhookSignature } from "../../src/webhooks/signature.js";
import { createTestDatabase } from "./db.js";
import type { TestDatabase } from "./db.js";

export const TEST_PASSWORD = "test-password-123";

/** Records dispatch calls so tests can assert what would have been pushed. */
export class RecordingPushDispatcher implements PushDispatcher {
  readonly calls: { alarmId: string; requestId: string }[] = [];

  async sendForAlarm(alarmId: string, requestId: string): Promise<void> {
    this.calls.push({ alarmId, requestId });
  }
}

export type TestHarness = {
  app: Awaited<ReturnType<typeof buildServer>>;
  db: Db;
  dispatcher: RecordingPushDispatcher;
  destroy: () => Promise<void>;
};

export async function createHarness(): Promise<TestHarness> {
  const database: TestDatabase = await createTestDatabase();
  const dispatcher = new RecordingPushDispatcher();
  const app = await buildServer({ db: database.db, pushDispatcher: dispatcher });
  await app.ready();

  return {
    app,
    db: database.db,
    dispatcher,
    destroy: async () => {
      await app.close();
      await database.destroy();
    },
  };
}

export async function createUser(
  db: Db,
  options: { email: string; role?: string; active?: boolean } ,
): Promise<{ id: string; email: string }> {
  const user = await db.user.create({
    data: {
      email: options.email,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: options.role ?? "MANAGER",
      active: options.active ?? true,
    },
  });
  return { id: user.id, email: user.email };
}

export async function login(
  harness: TestHarness,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await harness.app.inject({
    method: "POST",
    url: "/v1/auth/login",
    payload: { email, password },
  });

  const body = response.json();
  if (response.statusCode !== 200) {
    throw new Error(`login failed (${response.statusCode}): ${JSON.stringify(body)}`);
  }

  return { accessToken: body.data.accessToken, refreshToken: body.data.refreshToken };
}

export function authHeaders(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}` };
}

/**
 * Signs a payload exactly as a source system would: over the serialised bytes
 * that are actually transmitted, never over a re-serialised object.
 */
export function signedWebhook(
  payload: unknown,
  options: { secret?: string; format?: string } = {},
): { body: string; headers: Record<string, string> } {
  const body = JSON.stringify(payload);
  const secret = options.secret ?? config.INTERNAL_WEBHOOK_SECRET;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    [INTERNAL_WEBHOOK_SIGNATURE_HEADER]: computeWebhookSignature(body, secret),
  };

  if (options.format) headers["x-source-format"] = options.format;

  return { body, headers };
}

export function postWebhook(
  harness: TestHarness,
  payload: unknown,
  options: { secret?: string; format?: string } = {},
) {
  const { body, headers } = signedWebhook(payload, options);
  return harness.app.inject({
    method: "POST",
    url: "/v1/internal/alarms",
    headers,
    payload: body,
  });
}
