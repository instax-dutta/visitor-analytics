export interface DashboardSummary {
  totalVisits: number;
  uniqueSessions: number;
  avgLoadTime: number | null;
  avgLcp: number | null;
  avgCls: number | null;
  avgSessionDuration: number | null;
  bounceRate: number | null;
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

export interface RawRecord {
  id: string;
  sessionId: string;
  timestamp: number;
  pagePath: string;
  formFactor: string;
  browserName: string;
  os: string;
  data: Record<string, unknown>;
}

export interface AnalyticsQuery {
  since?: number;
  until?: number;
  pagePath?: string;
  sessionId?: string;
  interval?: string;
  dimension?: string;
}
