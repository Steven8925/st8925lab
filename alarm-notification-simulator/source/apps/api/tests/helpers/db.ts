import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { REPO_ROOT } from "../../src/config.js";
import { createPrismaClient } from "../../src/db/prisma.js";
import type { Db } from "../../src/db/prisma.js";

const MIGRATIONS_DIR = path.join(REPO_ROOT, "apps", "api", "prisma", "migrations");
const TEST_DB_DIR = path.join(REPO_ROOT, "data", "test");

/**
 * Applies the real migration SQL to a fresh file rather than mocking the
 * database. A test suite that passes against a hand-written schema tells you
 * nothing about whether the migrations produce that schema.
 */
function applyMigrations(databaseFile: string): void {
  const sqlite = new Database(databaseFile);
  try {
    const directories = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    if (directories.length === 0) {
      throw new Error(`No migrations found in ${MIGRATIONS_DIR}. Run: npm run db:migrate`);
    }

    for (const directory of directories) {
      const sqlPath = path.join(MIGRATIONS_DIR, directory, "migration.sql");
      if (!fs.existsSync(sqlPath)) continue;
      sqlite.exec(fs.readFileSync(sqlPath, "utf8"));
    }
  } finally {
    sqlite.close();
  }
}

export type TestDatabase = {
  db: Db;
  file: string;
  destroy: () => Promise<void>;
};

export async function createTestDatabase(): Promise<TestDatabase> {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });

  const file = path.join(TEST_DB_DIR, `test-${crypto.randomUUID()}.db`);
  applyMigrations(file);

  const db = createPrismaClient(`file:${file}`);

  return {
    db,
    file,
    destroy: async () => {
      await db.$disconnect();
      for (const suffix of ["", "-journal", "-wal", "-shm"]) {
        const candidate = `${file}${suffix}`;
        if (fs.existsSync(candidate)) {
          try {
            fs.unlinkSync(candidate);
          } catch {
            // Windows can hold a brief lock after disconnect; a leftover file in
            // data/test is harmless and gitignored.
          }
        }
      }
    },
  };
}
