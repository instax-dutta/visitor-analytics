import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "../config.js";

/** Applies security headers (CSP, X-Frame-Options, etc.) and CORS. */
export function security(app: { use: (m: unknown) => void }): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: config.nodeEnv === "production",
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","),
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-API-Key", "Authorization", "X-Signature", "X-Batch-Id", "X-Record-Count"],
    })
  );
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found", message: "Route not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = (err as { status?: number }).status ?? 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ error: "internal_error", message });
}
