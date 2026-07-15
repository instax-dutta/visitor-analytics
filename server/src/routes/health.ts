import { Router, type Request, type Response } from "express";
import { getStorage } from "../db/index.js";
import { logger } from "../logger.js";

export const healthRouter = Router();

/** GET /health — liveness/readiness probe for load balancers and orchestrators. */
healthRouter.get("/", async (_req: Request, res: Response) => {
  const storage = await getStorage();
  const dbOk = await storage.healthCheck();
  if (!dbOk) {
    return res.status(503).json({ status: "unhealthy", dependencies: { database: "down" } });
  }
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dependencies: { database: "up" },
  });
});

/** GET /health/ready — readiness probe (accepts traffic only when storage is up). */
healthRouter.get("/ready", async (_req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const ok = await storage.healthCheck();
    if (!ok) throw new Error("storage down");
    res.status(200).json({ status: "ready" });
  } catch (err) {
    logger.warn("Readiness check failed", { error: err });
    res.status(503).json({ status: "not_ready" });
  }
});
