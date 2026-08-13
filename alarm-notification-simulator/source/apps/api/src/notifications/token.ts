import { isSimulatorPushToken } from "@alarm/contracts";

const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]\s]{1,200}\]$/;

/**
 * Token format validation, shared by device registration and the push
 * providers. Both simulator and Expo formats are always accepted regardless of
 * PUSH_PROVIDER: a device registered before a provider switch must not be
 * silently rejected, and the provider itself refuses tokens it cannot deliver.
 */
export function isValidPushToken(token: string): boolean {
  return isSimulatorPushToken(token) || EXPO_TOKEN_PATTERN.test(token);
}

export function isExpoPushToken(token: string): boolean {
  return EXPO_TOKEN_PATTERN.test(token);
}
