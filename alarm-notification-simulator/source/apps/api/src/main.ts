import { config } from "./config.js";
import { prisma } from "./db/prisma.js";
import { SourceEventPoller } from "./ingest/source-poller.js";
import { HttpSourceEventReader } from "./ingest/source-reader.js";
import { logger } from "./logger.js";
import { RetentionSweeper } from "./maintenance/retention.js";
import { createNotificationStack } from "./notifications/factory.js";
import { buildServer } from "./server.js";

async function main() {
  const notifications = createNotificationStack(prisma);

  const app = await buildServer({
    db: prisma,
    pushDispatcher: notifications.dispatcher,
    simulatorHub: notifications.hub,
  });

  // Receipts are polled on a timer rather than awaited inline: a ticket is not
  // a delivery, and the gap between the two is where dead tokens are found.
  notifications.receipts.start();

  /**
   * Pull-based ingestion for customer systems that only write a row and wait to
   * be read. Runs alongside the webhook route - both feed the same pipeline.
   */
  const poller = config.SOURCE_POLL_ENABLED
    ? new SourceEventPoller(
        prisma,
        new HttpSourceEventReader(config.SOURCE_POLL_URL),
        { intervalMs: config.SOURCE_POLL_INTERVAL_MS },
        notifications.dispatcher,
      )
    : null;

  poller?.start();

  /**
   * Enforces the retention policy the console header states to the operator.
   * Displaying "kept for N days" without a sweeper actually deleting anything
   * would be a claim the system does not honour.
   */
  const retention = new RetentionSweeper(prisma, {
    retentionDays: config.TEST_DATA_RETENTION_DAYS,
    intervalMs: config.TEST_DATA_RETENTION_SWEEP_MS,
  });
  retention.start();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    poller?.stop();
    retention.stop();
    notifications.receipts.stop();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: config.API_PORT, host: "0.0.0.0" });
  logger.info(
    {
      port: config.API_PORT,
      pushProvider: notifications.provider.name,
      sourcePolling: config.SOURCE_POLL_ENABLED
        ? `every ${config.SOURCE_POLL_INTERVAL_MS}ms from ${config.SOURCE_POLL_URL}`
        : "disabled",
      testDataRetention:
        config.TEST_DATA_RETENTION_DAYS > 0
          ? `${config.TEST_DATA_RETENTION_DAYS} days, swept every ${config.TEST_DATA_RETENTION_SWEEP_MS}ms`
          : "disabled",
    },
    "Notification API listening",
  );
}

main().catch((error) => {
  logger.fatal({ err: error }, "Failed to start notification API");
  process.exit(1);
});
