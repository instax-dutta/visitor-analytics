import "dotenv/config";

export interface ServerConfig {
  port: number;
  nodeEnv: "development" | "test" | "production";
  logLevel: string;
  storage: "postgres" | "memory";
  databaseUrl: string;
  apiKeys: string[];
  hmacSecret: string | null;
  corsOrigin: string;
  trustProxy: boolean | number | string;
  rateLimit: {
    windowMs: number;
    max: number;
  };
  retentionDays: number;
  publicBaseUrl: string;
}

function parseStorage(): "postgres" | "memory" {
  const explicit = process.env.STORAGE;
  if (explicit === "postgres" || explicit === "memory") return explicit;
  // Default: postgres when a DATABASE_URL is provided, else in-memory.
  return process.env.DATABASE_URL ? "postgres" : "memory";
}

function parseApiKeys(): string[] {
  const raw = process.env.API_KEYS ?? "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function parseTrustProxy(): boolean | number | string {
  const raw = process.env.TRUST_PROXY ?? "0";
  if (raw === "true") return true;
  if (raw === "false") return false;
  const n = Number(raw);
  if (!Number.isNaN(n)) return n;
  return raw;
}

export const config: ServerConfig = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: (process.env.NODE_ENV as ServerConfig["nodeEnv"]) ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
  storage: parseStorage(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  apiKeys: parseApiKeys(),
  hmacSecret: process.env.HMAC_SECRET && process.env.HMAC_SECRET.length > 0 ? process.env.HMAC_SECRET : null,
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  trustProxy: parseTrustProxy(),
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 600),
  },
  retentionDays: Number(process.env.RETENTION_DAYS ?? 365),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
};

export function isProduction(): boolean {
  return config.nodeEnv === "production";
}
