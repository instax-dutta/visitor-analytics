import type { AnalyticsRecordDTO } from "../schema.js";
import type { StoredRecord } from "./types.js";

/** Extract indexed/aggregate columns from a raw record for efficient querying. */
export function enrich(
  record: AnalyticsRecordDTO,
  projectId: string,
  schemaVersion: number
): StoredRecord {
  const i = record.interaction;
  return {
    id: record.id,
    projectId,
    sessionId: record.sessionId,
    timestamp: record.timestamp,
    pagePath: record.pagePath,
    referrer: record.referrer,
    schemaVersion,
    formFactor: record.device?.formFactor ?? "unknown",
    browserName: record.browser?.name ?? "unknown",
    os: record.device?.os ?? "unknown",
    effectiveType: record.performance?.effectiveType ?? "unknown",
    utmSource: i?.utmSource ?? null,
    utmMedium: i?.utmMedium ?? null,
    utmCampaign: i?.utmCampaign ?? null,
    data: record,
    createdAt: new Date(),
  };
}

/** Build a tenant-scoped project id from the API key that submitted the batch. */
export function projectIdFromApiKey(apiKey: string): string {
  // Stable, non-reversible mapping so the same key always maps to the same
  // project namespace. We avoid storing the raw key alongside data.
  return `proj_${hashString(apiKey).slice(0, 16)}`;
}

function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
