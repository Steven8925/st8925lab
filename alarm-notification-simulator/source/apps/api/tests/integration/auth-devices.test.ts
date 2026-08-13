import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { makeSimulatorPushToken } from "@alarm/contracts";
import { authHeaders, createHarness, createUser, login, TEST_PASSWORD } from "../helpers/app.js";
import type { TestHarness } from "../helpers/app.js";

let harness: TestHarness;

beforeEach(async () => {
  harness = await createHarness();
});

afterEach(async () => {
  await harness.destroy();
});

describe("authentication", () => {
  test("logs in with valid credentials", async () => {
    const user = await createUser(harness.db, { email: "login@test.local" });

    const response = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: user.email, password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json().data;
    expect(data.accessToken).toBeTypeOf("string");
    expect(data.refreshToken).toBeTypeOf("string");
    expect(data.user.email).toBe(user.email);
    // The response must never echo the stored hash back to the client.
    expect(JSON.stringify(data)).not.toContain("$argon2");
  });

  test("rejects a wrong password and an unknown account identically", async () => {
    const user = await createUser(harness.db, { email: "wrong@test.local" });

    const wrongPassword = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: user.email, password: "not-the-password" },
    });
    const unknownAccount = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "nobody@test.local", password: TEST_PASSWORD },
    });

    // Different messages would let an attacker enumerate valid accounts.
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownAccount.statusCode).toBe(401);
    expect(wrongPassword.json().error.message).toBe(unknownAccount.json().error.message);
  });

  test("rejects an inactive account", async () => {
    const user = await createUser(harness.db, { email: "inactive@test.local", active: false });

    const response = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: user.email, password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(401);
  });

  test("refresh rotates the token and invalidates the old one", async () => {
    const user = await createUser(harness.db, { email: "rotate@test.local" });
    const session = await login(harness, user.email);

    const refreshed = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: session.refreshToken },
    });

    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().data.refreshToken).not.toBe(session.refreshToken);

    // Reusing the old token must fail - that is what limits a stolen token to
    // a single use before the real user's next refresh kills it.
    const reuse = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: session.refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
  });

  test("logout revokes the refresh token and is idempotent", async () => {
    const user = await createUser(harness.db, { email: "logout@test.local" });
    const session = await login(harness, user.email);

    const first = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      payload: { refreshToken: session.refreshToken },
    });
    const second = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      payload: { refreshToken: session.refreshToken },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);

    const refresh = await harness.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: session.refreshToken },
    });
    expect(refresh.statusCode).toBe(401);
  });

  test("refresh tokens are not stored in plain text", async () => {
    const user = await createUser(harness.db, { email: "hashed@test.local" });
    const session = await login(harness, user.email);

    const stored = await harness.db.refreshToken.findMany();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).not.toBe(session.refreshToken);
    expect(stored[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("device registration", () => {
  const token = makeSimulatorPushToken("device-abc");

  test("registers a device and is idempotent on repeat calls", async () => {
    const user = await createUser(harness.db, { email: "dev@test.local" });
    const session = await login(harness, user.email);

    const payload = { pushToken: token, platform: "android", label: "Pixel 8" };

    const first = await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      headers: authHeaders(session.accessToken),
      payload,
    });
    const second = await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      headers: authHeaders(session.accessToken),
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json().data.id).toBe(first.json().data.id);
    // Re-registering on every launch is the self-healing path for token
    // rotation, so it must not accumulate duplicate rows.
    expect(await harness.db.device.count()).toBe(1);
  });

  test("reassigns a token that moves to another account", async () => {
    const alice = await createUser(harness.db, { email: "hand-a@test.local" });
    const bob = await createUser(harness.db, { email: "hand-b@test.local" });

    const aliceSession = await login(harness, alice.email);
    await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      headers: authHeaders(aliceSession.accessToken),
      payload: { pushToken: token, platform: "android" },
    });

    const bobSession = await login(harness, bob.email);
    await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      headers: authHeaders(bobSession.accessToken),
      payload: { pushToken: token, platform: "android" },
    });

    const devices = await harness.db.device.findMany();
    expect(devices).toHaveLength(1);
    // Without this, Alice would keep receiving alarms on a phone Bob now uses.
    expect(devices[0]?.userId).toBe(bob.id);
  });

  test("reactivates a device that a bad receipt had deactivated", async () => {
    const user = await createUser(harness.db, { email: "revive@test.local" });
    const session = await login(harness, user.email);

    await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      headers: authHeaders(session.accessToken),
      payload: { pushToken: token, platform: "android" },
    });
    await harness.db.device.updateMany({ data: { active: false } });

    const reregister = await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      headers: authHeaders(session.accessToken),
      payload: { pushToken: token, platform: "android" },
    });

    expect(reregister.json().data.active).toBe(true);
  });

  test("rejects a malformed push token", async () => {
    const user = await createUser(harness.db, { email: "badtoken@test.local" });
    const session = await login(harness, user.email);

    const response = await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      headers: authHeaders(session.accessToken),
      payload: { pushToken: "just-some-string", platform: "android" },
    });

    expect(response.statusCode).toBe(400);
    expect(await harness.db.device.count()).toBe(0);
  });

  test("accepts an Expo-format token so a provider switch does not break devices", async () => {
    const user = await createUser(harness.db, { email: "expo@test.local" });
    const session = await login(harness, user.email);

    const response = await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      headers: authHeaders(session.accessToken),
      payload: { pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", platform: "android" },
    });

    expect(response.statusCode).toBe(200);
  });

  test("requires authentication", async () => {
    const response = await harness.app.inject({
      method: "POST",
      url: "/v1/devices/register",
      payload: { pushToken: token, platform: "android" },
    });

    expect(response.statusCode).toBe(401);
  });
});
