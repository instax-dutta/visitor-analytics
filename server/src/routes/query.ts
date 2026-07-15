import { Router, type Request, type Response } from "express";
import { getStorage } from "../db/index.js";
import type { QueryParams } from "../db/types.js";

export const queryRouter = Router();

function parseQuery(req: Request, res: Response): QueryParams {
  const projectId = res.locals.projectId as string;
  const since = numParam(req.query.since);
  const until = numParam(req.query.until);
  const pagePath = typeof req.query.pagePath === "string" ? req.query.pagePath : undefined;
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
  const limit = numParam(req.query.limit);
  const offset = numParam(req.query.offset);
  return {
    projectId,
    since: since ?? undefined,
    until: until ?? undefined,
    pagePath,
    sessionId,
    limit: limit ?? undefined,
    offset: offset ?? undefined,
  };
}

/** GET /api/v1/summary — headline KPIs for the selected window. */
queryRouter.get("/summary", async (req: Request, res: Response) => {
  const storage = await getStorage();
  const summary = await storage.summary(parseQuery(req, res));
  res.json(summary);
});

/** GET /api/v1/timeseries?interval=day|hour|week|month — visits over time. */
queryRouter.get("/timeseries", async (req: Request, res: Response) => {
  const storage = await getStorage();
  const interval = typeof req.query.interval === "string" ? req.query.interval : "day";
  const series = await storage.timeSeries(parseQuery(req, res), interval);
  res.json({ interval, points: series });
});

/** GET /api/v1/breakdown?dimension=browser — categorical breakdown. */
queryRouter.get("/breakdown", async (req: Request, res: Response) => {
  const storage = await getStorage();
  const dimension = typeof req.query.dimension === "string" ? req.query.dimension : "browser";
  try {
    const rows = await storage.breakdown(parseQuery(req, res), dimension);
    res.json({ dimension, rows });
  } catch (err) {
    res.status(400).json({ error: "bad_dimension", message: (err as Error).message });
  }
});

/** GET /api/v1/records — raw paginated records (for drill-down tables). */
queryRouter.get("/records", async (req: Request, res: Response) => {
  const storage = await getStorage();
  const records = await storage.query(parseQuery(req, res));
  res.json({
    count: records.length,
    records: records.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      timestamp: r.timestamp,
      pagePath: r.pagePath,
      formFactor: r.formFactor,
      browserName: r.browserName,
      os: r.os,
      data: r.data,
    })),
  });
});

function numParam(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
