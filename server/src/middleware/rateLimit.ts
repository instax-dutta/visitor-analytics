import rateLimit from "express-rate-limit";
import { config } from "../config.js";

/**
 * Sliding-window rate limiter keyed by client IP. Protects the ingest endpoint
 * from abuse and accidental traffic spikes. Tune via RATE_LIMIT_* env vars.
 */
export const ingestRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.ip ?? req.socket.remoteAddress ?? "unknown"),
  handler: (req, res) => {
    res.status(429).json({
      error: "rate_limited",
      message: "Too many requests, please retry later.",
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    });
  },
});
