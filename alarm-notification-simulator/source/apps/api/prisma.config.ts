import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// The monorepo keeps a single .env at the repository root so the API, the
// simulated operations server and the Prisma CLI cannot drift apart on
// INTERNAL_WEBHOOK_SECRET.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
loadEnv({ path: path.join(repoRoot, ".env") });

// Mirrors resolveDatabaseUrl() in src/config.ts. A relative file: URL would
// resolve against the current working directory, so running the CLI from
// apps/api and the server from the repo root would open two different files.
function resolveDatabaseUrl(url: string | undefined): string | undefined {
  if (!url || !url.startsWith("file:")) return url;
  const filePath = url.slice("file:".length);
  if (filePath.startsWith(":") || path.isAbsolute(filePath)) return url;
  return `file:${path.resolve(repoRoot, filePath)}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: resolveDatabaseUrl(process.env["DATABASE_URL"]),
  },
});
