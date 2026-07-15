import type { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { metrics } from "../metrics.js";
import { projectIdFromApiKey } from "../db/enrich.js";

/**
 * Authenticates ingest/admin requests.
 *
 * Two mechanisms, both optional depending on configuration:
 *  1. API key: sent via `X-API-Key` header or `Authorization: Bearer <key>`.
 *     Compared in constant time against the configured allow-list.
 *  2. Optional request signing: when HMAC_SECRET is configured, the raw body
 *     must be signed with HMAC-SHA256 and supplied in `X-Signature`. This
 *     proves the request originated from a party holding the secret even when
 *     transmitted over an untrusted path.
 *
 * On success, res.locals.projectId and res.locals.apiKey are set for downstream
 * handlers (used to tenant data).
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    metrics.authFailuresTotal.inc({ reason: "missing_key" });
    res.status(401).json({ error: "unauthorized", message: "Missing API key" });
    return;
  }

  if (!config.apiKeys.includes(apiKey)) {
    metrics.authFailuresTotal.inc({ reason: "invalid_key" });
    res.status(401).json({ error: "unauthorized", message: "Invalid API key" });
    return;
  }

  if (config.hmacSecret) {
    const signature = req.headers["x-signature"];
    const sigStr = Array.isArray(signature) ? signature[0] : signature;
    const raw = (req as { rawBody?: Buffer }).rawBody ?? JSON.stringify(req.body);
    if (!sigStr || !verifySignature(raw, config.hmacSecret, sigStr)) {
      metrics.authFailuresTotal.inc({ reason: "bad_signature" });
      res.status(401).json({ error: "unauthorized", message: "Invalid signature" });
      return;
    }
  }

  res.locals.apiKey = apiKey;
  res.locals.projectId = projectIdFromApiKey(apiKey);
  next();
}

function extractApiKey(req: Request): string | null {
  const headerKey = req.headers["x-api-key"];
  if (typeof headerKey === "string") return headerKey;
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  return null;
}

function verifySignature(
  body: Buffer | string,
  secret: string,
  provided: string
): boolean {
  const raw = typeof body === "string" ? body : body.toString("utf8");
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
