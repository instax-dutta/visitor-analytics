import { createLogger, format, transports, type Logger } from "winston";
import { config } from "./config.js";

const logger: Logger = createLogger({
  level: config.logLevel,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    config.nodeEnv === "production"
      ? format.json()
      : format.combine(format.colorize(), format.simple())
  ),
  defaultMeta: { service: "visitor-analytics-backend" },
  transports: [new transports.Console()],
});

export { logger };
