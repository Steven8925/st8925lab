import { config } from "./config.js";
import { logger } from "./logger.js";
import { buildOpsServer } from "./server.js";

async function main() {
  const { app } = await buildOpsServer();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: config.OPS_PORT, host: "0.0.0.0" });
  logger.info(
    { port: config.OPS_PORT, notificationApi: config.NOTIFICATION_API_BASE_URL },
    "Simulated operations server listening",
  );
}

main().catch((error) => {
  logger.fatal({ err: error }, "Failed to start simulated operations server");
  process.exit(1);
});
