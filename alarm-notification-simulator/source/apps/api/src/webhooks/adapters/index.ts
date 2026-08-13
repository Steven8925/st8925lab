import { AppError } from "../../lib/errors.js";
import { legacyOpsV1Adapter } from "./legacy-ops-v1.js";
import { sensorThresholdV1Adapter } from "./sensor-threshold-v1.js";
import { standardAdapter } from "./standard.js";
import type { SourceAdapter } from "./types.js";

export const SOURCE_FORMAT_HEADER = "x-source-format";

const adapters = new Map<string, SourceAdapter>(
  [standardAdapter, legacyOpsV1Adapter, sensorThresholdV1Adapter].map((adapter) => [
    adapter.name,
    adapter,
  ]),
);

export const DEFAULT_ADAPTER_NAME = standardAdapter.name;

/**
 * Selects the adapter for an incoming webhook. Adding a customer format means
 * adding one file and one entry above - the ingest pipeline is untouched.
 */
export function resolveAdapter(formatHeader: string | string[] | undefined): SourceAdapter {
  if (formatHeader === undefined) {
    return standardAdapter;
  }

  const name = (Array.isArray(formatHeader) ? formatHeader[0] : formatHeader)?.trim();
  if (!name) return standardAdapter;

  const adapter = adapters.get(name);
  if (!adapter) {
    throw AppError.badRequest(
      `Unknown source format "${name}". Known formats: ${[...adapters.keys()].join(", ")}`,
    );
  }

  return adapter;
}

export function listAdapters(): { name: string; description: string }[] {
  return [...adapters.values()].map((adapter) => ({
    name: adapter.name,
    description: adapter.description,
  }));
}

export type { NormalisedAlarmEvent, SourceAdapter } from "./types.js";
