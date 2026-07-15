import { createApp, startRetentionJob } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { getStorage } from "./db/index.js";

async function main(): Promise<void> {
  const app = createApp();
  const storage = await getStorage();
  const dbOk = await storage.healthCheck();
  if (!dbOk) {
    logger.warn("Storage backend is not reachable; ingestion will fail until it is available.", {
      storage: config.storage,
    });
  }

  const server = app.listen(config.port, () => {
    logger.info("Visitor Analytics backend listening", {
      port: config.port,
      storage: config.storage,
      env: config.nodeEnv,
    });
  });

  startRetentionJob();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Failed to start server", { error: err });
  process.exit(1);
});
