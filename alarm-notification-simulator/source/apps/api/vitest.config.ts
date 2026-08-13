import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Silence request logging so a failing assertion is not buried under
    // thousands of pino lines.
    env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
    include: ["tests/**/*.test.ts"],
    // Each test file opens its own SQLite file; running files sequentially
    // keeps Windows file locking predictable and the output readable.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
