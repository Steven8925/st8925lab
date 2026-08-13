import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client.js";
import { config, resolveDatabaseUrl } from "../config.js";

/**
 * Prisma 7 requires an explicit driver adapter. Swapping to PostgreSQL means
 * replacing this adapter with `@prisma/adapter-pg` and changing the datasource
 * provider in prisma/schema.prisma - no query in the application changes.
 */
export function createPrismaClient(databaseUrl: string = config.DATABASE_URL) {
  const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl(databaseUrl) });
  return new PrismaClient({ adapter });
}

export type Db = ReturnType<typeof createPrismaClient>;

export const prisma = createPrismaClient();
