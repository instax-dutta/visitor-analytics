import { Router, type Request, type Response } from "express";
import { getStorage } from "../db/index.js";
import { metrics } from "../metrics.js";
import { logger } from "../logger.js";
import type { DeleteFilter } from "../db/types.js";

export const adminRouter = Router();

/**
 * DELETE /api/v1/data
 * GDPR / CCPA data deletion. Deletes records for a subject, scoped to the
 * authenticated project. Identify the subject by sessionId, or by a
 * metadata.customData key/value pair (e.g. your own internal user id).
 *
 * Body (JSON): { sessionId?: string, customDataKey?: string, customDataValue?: string }
 */
adminRouter.delete("/data", async (req: Request, res: Response) => {
  const projectId = res.locals.projectId as string;
  const { sessionId, customDataKey, customDataValue } = req.body ?? {};

  const filter: DeleteFilter = { projectId };
  if (typeof sessionId === "string" && sessionId.length > 0) filter.sessionId = sessionId;
  if (typeof customDataKey === "string" && typeof customDataValue === "string") {
    filter.customDataKey = customDataKey;
    filter.customDataValue = customDataValue;
  }

  if (!filter.sessionId && !filter.customDataKey) {
    metrics.gdprDeletionsTotal.inc({ status: "invalid" });
    return res.status(400).json({
      error: "bad_request",
      message: "Provide sessionId or customDataKey+customDataValue",
    });
  }

  try {
    const storage = await getStorage();
    const deleted = await storage.deleteByFilter(filter);
    metrics.gdprDeletionsTotal.inc({ status: "ok" });
    logger.info("GDPR deletion processed", { projectId, deleted, filter });
    res.json({ status: "deleted", deleted });
  } catch (err) {
    metrics.gdprDeletionsTotal.inc({ status: "error" });
    logger.error("GDPR deletion failed", { error: err });
    res.status(500).json({ error: "deletion_failed", message: (err as Error).message });
  }
});

/**
 * GET /api/v1/export
 * GDPR data portability: export a subject's raw records as JSON.
 * Query params mirror the deletion filter.
 */
adminRouter.get("/export", async (req: Request, res: Response) => {
  const projectId = res.locals.projectId as string;
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
  const customDataKey = typeof req.query.customDataKey === "string" ? req.query.customDataKey : undefined;
  const customDataValue = typeof req.query.customDataValue === "string" ? req.query.customDataValue : undefined;

  const filter: DeleteFilter = { projectId };
  if (sessionId) filter.sessionId = sessionId;
  if (customDataKey && customDataValue) {
    filter.customDataKey = customDataKey;
    filter.customDataValue = customDataValue;
  }
  if (!filter.sessionId && !filter.customDataKey) {
    return res.status(400).json({
      error: "bad_request",
      message: "Provide sessionId or customDataKey+customDataValue",
    });
  }

  const storage = await getStorage();
  const records = await storage.exportByFilter(filter);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="visitor-analytics-export.json"');
  res.json({ count: records.length, records: records.map((r) => r.data) });
});
