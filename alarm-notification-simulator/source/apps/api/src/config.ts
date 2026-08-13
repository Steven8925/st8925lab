import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");

loadEnv({ path: path.join(REPO_ROOT, ".env"), quiet: true });

/**
 * Fail fast on misconfiguration. A server that starts with a missing secret and
 * only breaks under load is worse than one that refuses to start.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  INTERNAL_WEBHOOK_SECRET: z
    .string()
    .min(32, "INTERNAL_WEBHOOK_SECRET must be at least 32 characters and different from JWT_SECRET"),

  PUSH_PROVIDER: z.enum(["simulator", "expo"]).default("simulator"),
  SIMULATOR_RECEIPT_DELAY_MS: z.coerce.number().int().min(0).max(60_000).default(3000),

  /**
   * Pull-based ingestion, for customer systems that only write a row to their
   * own database rather than calling us.
   *
   * SOURCE_POLL_INTERVAL_MS is the FLOOR ON ALARM LATENCY: a red-light reading
   * can wait up to one full interval before anyone is notified.
   */
  SOURCE_POLL_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  SOURCE_POLL_INTERVAL_MS: z.coerce.number().int().min(500).max(300_000).default(5000),
  SOURCE_POLL_URL: z.string().url().default("http://localhost:4000/v1/source-events/claim"),

  EXPO_ACCESS_TOKEN: z.string().optional(),
  EXPO_PROJECT_ID: z.string().optional(),

  /**
   * The single timezone alarm reference codes are dated in.
   *
   * System-wide on purpose. If each reader's device zone were used, one alarm
   * would be TANK01-20260813-01 in Taipei and TANK01-20260812-01 in London, and
   * the customer and the vendor could not discuss the same alarm by name.
   *
   * Changing this on a running system does NOT renumber existing codes; it only
   * affects which day subsequent alarms are filed under, and a change made
   * mid-day can restart numbering for that day's remaining alarms.
   */
  ALARM_REFERENCE_TIMEZONE: z.string().min(1).default("Asia/Taipei"),

  /**
   * How many days of simulation data to keep. `0` disables retention.
   *
   * The console header states this figure to the operator, so it must be
   * enforced by the sweeper rather than merely displayed - see
   * src/maintenance/retention.ts.
   */
  TEST_DATA_RETENTION_DAYS: z.coerce.number().int().min(0).max(3650).default(3),
  TEST_DATA_RETENTION_SWEEP_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(86_400_000)
    .default(3_600_000),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  SEED_MANAGER_EMAIL: z.string().email().default("manager@demo.local"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@demo.local"),
  SEED_PASSWORD: z.string().min(8).optional(),
});

function load() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}\n\nCopy .env.example to .env and fill it in.`);
  }

  if (parsed.data.JWT_SECRET === parsed.data.INTERNAL_WEBHOOK_SECRET) {
    throw new Error("JWT_SECRET and INTERNAL_WEBHOOK_SECRET must be different secrets.");
  }

  if (parsed.data.PUSH_PROVIDER === "expo" && !parsed.data.EXPO_PROJECT_ID) {
    throw new Error("PUSH_PROVIDER=expo requires EXPO_PROJECT_ID to be set.");
  }

  /**
   * Validated here so a typo is loud at startup. The runtime formatter falls
   * back to the host's zone rather than throwing - an unusable zone must never
   * be able to drop an alarm - which means an unchecked typo would silently
   * date every code in the wrong timezone and nothing would ever complain.
   */
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: parsed.data.ALARM_REFERENCE_TIMEZONE });
  } catch {
    throw new Error(
      `ALARM_REFERENCE_TIMEZONE is not a valid IANA timezone: ${parsed.data.ALARM_REFERENCE_TIMEZONE}`,
    );
  }

  return parsed.data;
}

export const config = load();
export type Config = typeof config;

/**
 * A relative `file:` URL would otherwise resolve against process.cwd(), so
 * running the API from the repo root and the Prisma CLI from apps/api would
 * silently open two different databases. Anchor it to the repo root instead.
 */
export function resolveDatabaseUrl(url: string = config.DATABASE_URL): string {
  if (!url.startsWith("file:")) return url;

  const filePath = url.slice("file:".length);
  if (filePath === ":memory:" || filePath.startsWith(":")) return url;
  if (path.isAbsolute(filePath)) return url;

  return `file:${path.resolve(REPO_ROOT, filePath)}`;
}

/** Origins allowed to call the API. Comma-separated in CORS_ORIGIN. */
export const corsOrigins = config.CORS_ORIGIN.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
