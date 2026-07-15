import type { AnalyticsRecordDTO } from "../schema.js";

/** A record as persisted, enriched with tenant + extracted query columns. */
export interface StoredRecord {
  id: string;
  projectId: string;
  sessionId: string;
  timestamp: number;
  pagePath: string;
  referrer: string;
  schemaVersion: number;
  formFactor: string;
  browserName: string;
  os: string;
  effectiveType: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  data: AnalyticsRecordDTO;
  createdAt: Date;
}

export interface QueryParams {
  projectId: string;
  since?: number;
  until?: number;
  pagePath?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

export interface TimeSeriesPoint {
  bucket: string;
  visits: number;
  sessions: number;
  avgLoadTime: number | null;
  avgLcp: number | null;
  avgCls: number | null;
  bounceRate: number | null;
}

export interface BreakdownRow {
  key: string;
  value: number;
}

export interface DashboardSummary {
  totalVisits: number;
  uniqueSessions: number;
  avgLoadTime: number | null;
  avgLcp: number | null;
  avgCls: number | null;
  avgSessionDuration: number | null;
  bounceRate: number | null;
}

export interface DeleteFilter {
  projectId: string;
  sessionId?: string;
  /** Match a key/value pair inside record metadata.customData (GDPR subject id). */
  customDataKey?: string;
  customDataValue?: string;
}

export interface Storage {
  init(): Promise<void>;
  insertBatch(records: StoredRecord[]): Promise<number>;
  query(params: QueryParams): Promise<StoredRecord[]>;
  summary(params: QueryParams): Promise<DashboardSummary>;
  timeSeries(params: QueryParams, interval: string): Promise<TimeSeriesPoint[]>;
  breakdown(params: QueryParams, dimension: string): Promise<BreakdownRow[]>;
  deleteByFilter(filter: DeleteFilter): Promise<number>;
  exportByFilter(filter: DeleteFilter): Promise<StoredRecord[]>;
  count(): Promise<number>;
  purgeOlderThan(cutoff: Date): Promise<number>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}
