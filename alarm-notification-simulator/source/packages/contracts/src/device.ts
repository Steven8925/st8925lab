import { z } from "zod";
import { platformSchema, wirePlatformSchema } from "./enums.js";

export const deviceRegisterRequestSchema = z.object({
  pushToken: z.string().min(1).max(300),
  platform: wirePlatformSchema,
  appVersion: z.string().max(50).optional(),
  osVersion: z.string().max(50).optional(),
  locale: z.string().max(50).optional(),
  timezone: z.string().max(80).optional(),
  /** Free-text label so the simulator can show "Pixel 8" vs "Galaxy S24". */
  label: z.string().max(80).optional(),
});

export type DeviceRegisterRequest = z.infer<typeof deviceRegisterRequestSchema>;

export const deviceSchema = z.object({
  id: z.string(),
  platform: platformSchema,
  label: z.string().nullable(),
  active: z.boolean(),
  lastSeenAt: z.string(),
});

export type Device = z.infer<typeof deviceSchema>;

/**
 * Simulator push tokens deliberately mirror the shape of an Expo push token so
 * that token-format validation is exercised by the same code path in both
 * providers.
 */
export const SIMULATOR_TOKEN_PREFIX = "SimulatorPushToken[";

const SIMULATOR_TOKEN_PATTERN = /^SimulatorPushToken\[[0-9a-zA-Z-]{1,64}\]$/;

/**
 * Builds a simulator push token from any label.
 *
 * The input is slugified rather than interpolated verbatim. An earlier version
 * pasted the label straight in, so a label containing a space produced a token
 * that isSimulatorPushToken() then rejected - a constructor capable of emitting
 * an invalid value of its own type. The failure mode was silent: device
 * registration returned 400, no device existed, alarms were accepted with a
 * recipient who could never be reached, and nothing pointed at the token.
 */
export function makeSimulatorPushToken(id: string): string {
  const slug = id
    .trim()
    .replace(/[^0-9a-zA-Z-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

  if (slug.length === 0) {
    throw new Error(`Cannot build a simulator push token from "${id}": no usable characters`);
  }

  return `${SIMULATOR_TOKEN_PREFIX}${slug}]`;
}

export function isSimulatorPushToken(token: string): boolean {
  return SIMULATOR_TOKEN_PATTERN.test(token);
}
