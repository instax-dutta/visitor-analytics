import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

/** Assigns a correlation id to every request for tracing/debugging. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-request-id"];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
  res.setHeader("x-request-id", id);
  res.locals.requestId = id;
  next();
}
