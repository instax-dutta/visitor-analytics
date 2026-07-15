import { collectDefaultMetrics, Registry, Counter, Histogram, Gauge } from "prom-client";

const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const metrics = {
  ingestBatchesTotal: new Counter({
    name: "va_ingest_batches_total",
    help: "Total number of ingest batches received.",
    labelNames: ["status"],
    registers: [registry],
  }),
  ingestRecordsTotal: new Counter({
    name: "va_ingest_records_total",
    help: "Total number of analytics records ingested.",
    labelNames: ["status"],
    registers: [registry],
  }),
  ingestRequestDurationSeconds: new Histogram({
    name: "va_ingest_request_duration_seconds",
    help: "Duration of ingest requests in seconds.",
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  }),
  authFailuresTotal: new Counter({
    name: "va_auth_failures_total",
    help: "Total authentication failures.",
    labelNames: ["reason"],
    registers: [registry],
  }),
  invalidPayloadsTotal: new Counter({
    name: "va_invalid_payloads_total",
    help: "Total number of payloads rejected by validation.",
    registers: [registry],
  }),
  dbQueryDurationSeconds: new Histogram({
    name: "va_db_query_duration_seconds",
    help: "Duration of database queries in seconds.",
    labelNames: ["operation"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [registry],
  }),
  recordsStored: new Gauge({
    name: "va_records_stored",
    help: "Approximate number of analytics records currently stored.",
    registers: [registry],
  }),
  gdprDeletionsTotal: new Counter({
    name: "va_gdpr_deletions_total",
    help: "Total number of GDPR deletion requests processed.",
    labelNames: ["status"],
    registers: [registry],
  }),
};

export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

export { registry as metricsRegistry };
