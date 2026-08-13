import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

loadEnv({ path: path.join(repoRoot, ".env"), quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  OPS_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NOTIFICATION_API_BASE_URL: z.string().url().default("http://localhost:3000"),
  /**
   * Shared with the notification API. This server signs its webhooks with it,
   * which is the whole point of running it as a separate process: the HMAC has
   * to survive a real network hop, not an in-process function call.
   */
  INTERNAL_WEBHOOK_SECRET: z.string().min(32, "INTERNAL_WEBHOOK_SECRET must be at least 32 characters"),
  OPS_CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}\n\nCopy .env.example to .env and fill it in.`);
}

export const config = parsed.data;

export const corsOrigins = config.OPS_CORS_ORIGIN.split(",")
  .map((value) => value.trim())
  .filter(Boolean);
