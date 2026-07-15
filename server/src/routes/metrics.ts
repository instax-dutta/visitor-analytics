import { Router, type Request, type Response } from "express";
import { getMetrics } from "../metrics.js";

export const metricsRouter = Router();

/** GET /metrics — Prometheus-format metrics scrape endpoint (unauthenticated by default). */
metricsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const body = await getMetrics();
    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(body);
  } catch (err) {
    res.status(500).end();
  }
});
