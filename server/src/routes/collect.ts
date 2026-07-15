import { Router, type Request, type Response } from "express";
import { ZodError } from "zod";
import { parseUploadPayload, CURRENT_SCHEMA_VERSION } from "../schema.js";
import { getStorage } from "../db/index.js";
import { enrich } from "../db/enrich.js";
import { metrics } from "../metrics.js";
import { logger } from "../logger.js";

export const collectRouter = Router();

/**
 * POST /collect
 * Ingest a batch of analytics records from the SDK.
 * Body: { records: AnalyticsRecord[], batchId, timestamp, sdkVersion, schemaVersion? }
 */
collectRouter.post("/", async (req: Request, res: Response) => {
  const end = metrics.ingestRequestDurationSeconds.startTimer();
  const projectId = res.locals.projectId as string;
  const apiKey = res.locals.apiKey as string;

  let payload;
  try {
    payload = parseUploadPayload(req.body);
  } catch (err) {
    metrics.invalidPayloadsTotal.inc();
    metrics.ingestBatchesTotal.inc({ status: "invalid" });
    end();
    if (err instanceof ZodError) {
      return res.status(422).json({
        error: "validation_failed",
        message: "Payload failed validation",
        details: err.issues.slice(0, 50),
      });
    }
    return res.status(422).json({ error: "validation_failed", message: (err as Error).message });
  }

  const version = payload.schemaVersion ?? CURRENT_SCHEMA_VERSION;
  const stored = payload.records.map((r) => enrich(r, projectId, version));

  try {
    const storage = await getStorage();
    const inserted = await storage.insertBatch(stored);
    metrics.ingestBatchesTotal.inc({ status: "accepted" });
    metrics.ingestRecordsTotal.inc({ status: "accepted" }, stored.length);
    metrics.recordsStored.set(await storage.count());
    logger.debug("Ingested batch", {
      batchId: payload.batchId,
      projectId,
      received: stored.length,
      inserted,
      apiKey: maskKey(apiKey),
    });
    end();
    return res.status(202).json({
      status: "accepted",
      batchId: payload.batchId,
      received: stored.length,
      inserted,
    });
  } catch (err) {
    metrics.ingestBatchesTotal.inc({ status: "error" });
    metrics.ingestRecordsTotal.inc({ status: "error" }, stored.length);
    end();
    logger.error("Failed to persist batch", { error: err, batchId: payload.batchId });
    return res.status(500).json({ error: "storage_error", message: "Failed to store records" });
  }
});

function maskKey(key: string): string {
  if (key.length <= 6) return "***";
  return `${key.slice(0, 3)}***${key.slice(-3)}`;
}
