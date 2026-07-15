import express, { type Express, type Request } from "express";
import { security, notFoundHandler, errorHandler } from "./middleware/security.js";
import { requestId } from "./middleware/requestId.js";
import { authenticate } from "./middleware/auth.js";
import { ingestRateLimiter } from "./middleware/rateLimit.js";
import { collectRouter } from "./routes/collect.js";
import { healthRouter } from "./routes/health.js";
import { metricsRouter } from "./routes/metrics.js";
import { queryRouter } from "./routes/query.js";
import { adminRouter } from "./routes/admin.js";
import { logger } from "./logger.js";

const MAX_BODY_BYTES = "2mb";

/** Builds the Express application. Exported for testing without binding a port. */
export function createApp(): Express {
  const app = express();

  app.set("trust proxy", true);
  security(app);
  app.use(requestId);

  // Capture the raw body so HMAC signatures can be verified against the exact
  // bytes the client sent.
  app.use(
    express.json({
      limit: MAX_BODY_BYTES,
      verify: (req: Request, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  app.get("/", (_req, res) => {
    res.json({
      name: "visitor-analytics-backend",
      status: "running",
      docs: "/docs",
      endpoints: {
        ingest: "POST /collect",
        health: "GET /health",
        metrics: "GET /metrics",
        query: "GET /api/v1/*",
        admin: "DELETE/GET /api/v1/data,/api/v1/export",
      },
    });
  });

  app.use("/health", healthRouter);
  app.use("/metrics", metricsRouter);

  // Ingest: authenticated + rate limited.
  app.use("/collect", authenticate, ingestRateLimiter, collectRouter);

  // Dashboard query + admin: authenticated.
  app.use("/api/v1", authenticate, queryRouter);
  app.use("/api/v1", authenticate, adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** Starts the retention/purge cron. Runs every 24h in production. */
export function startRetentionJob(): NodeJS.Timeout | null {
  const RETENTION_MS = 24 * 60 * 60 * 1000;
  const tick = async () => {
    try {
      const { config } = await import("./config.js");
      const { getStorage } = await import("./db/index.js");
      const cutoff = new Date(Date.now() - config.retentionDays * RETENTION_MS);
      const storage = await getStorage();
      const purged = await storage.purgeOlderThan(cutoff);
      if (purged > 0) logger.info("Retention purge", { purged, cutoff: cutoff.toISOString() });
    } catch (err) {
      logger.warn("Retention job error", { error: err });
    }
  };
  // Run once shortly after boot, then daily.
  const timer = setInterval(tick, RETENTION_MS);
  setTimeout(tick, 60_000);
  return timer;
}
