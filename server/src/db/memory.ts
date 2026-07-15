import type { AnalyticsRecordDTO } from "../schema.js";
import type {
  BreakdownRow,
  DashboardSummary,
  DeleteFilter,
  QueryParams,
  Storage,
  StoredRecord,
  TimeSeriesPoint,
} from "./types.js";
import { enrich } from "./enrich.js";

const BREAKDOWN_ACCESSORS: Record<string, (r: StoredRecord) => string | null> = {
  formFactor: (r) => r.formFactor,
  browser: (r) => r.browserName,
  os: (r) => r.os,
  network: (r) => r.effectiveType,
  utmSource: (r) => r.utmSource,
  utmMedium: (r) => r.utmMedium,
  utmCampaign: (r) => r.utmCampaign,
  pagePath: (r) => r.pagePath,
  referrer: (r) => (r.referrer ? r.referrer : null),
};

function matches(r: StoredRecord, p: QueryParams): boolean {
  if (r.projectId !== p.projectId) return false;
  if (p.since !== undefined && r.timestamp < p.since) return false;
  if (p.until !== undefined && r.timestamp > p.until) return false;
  if (p.pagePath && r.pagePath !== p.pagePath) return false;
  if (p.sessionId && r.sessionId !== p.sessionId) return false;
  return true;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export class MemoryStorage implements Storage {
  private records: StoredRecord[] = [];

  async init(): Promise<void> {
    /* no-op */
  }

  async insertBatch(records: StoredRecord[]): Promise<number> {
    let inserted = 0;
    for (const r of records) {
      const existing = this.records.find(
        (x) => x.projectId === r.projectId && x.id === r.id
      );
      if (!existing) {
        this.records.push(r);
        inserted++;
      }
    }
    return inserted;
  }

  async query(params: QueryParams): Promise<StoredRecord[]> {
    const filtered = this.records.filter((r) => matches(r, params));
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    const offset = params.offset ?? 0;
    const limit = Math.min(params.limit ?? 100, 1000);
    return filtered.slice(offset, offset + limit);
  }

  async summary(params: QueryParams): Promise<DashboardSummary> {
    const filtered = this.records.filter((r) => matches(r, params));
    const sessions = new Set<string>();
    const engaged = new Set<string>();
    let loadSum = 0;
    let loadCount = 0;
    let lcpSum = 0;
    let lcpCount = 0;
    let clsSum = 0;
    let clsCount = 0;
    let durSum = 0;
    let durCount = 0;
    for (const r of filtered) {
      sessions.add(r.sessionId);
      const routeChanges = Number(r.data.interaction?.routeChanges ?? 0);
      if (routeChanges > 0) engaged.add(r.sessionId);
      const load = num(r.data.performance?.navigationTiming?.loadTime);
      if (load !== null) {
        loadSum += load;
        loadCount++;
      }
      const lcp = num(r.data.performance?.largestContentfulPaint);
      if (lcp !== null) {
        lcpSum += lcp;
        lcpCount++;
      }
      const cls = num(r.data.performance?.cumulativeLayoutShift);
      if (cls !== null) {
        clsSum += cls;
        clsCount++;
      }
      const dur = num(r.data.interaction?.sessionDuration);
      if (dur !== null) {
        durSum += dur;
        durCount++;
      }
    }
    const uniqueSessions = sessions.size;
    return {
      totalVisits: filtered.length,
      uniqueSessions,
      avgLoadTime: loadCount ? loadSum / loadCount : null,
      avgLcp: lcpCount ? lcpSum / lcpCount : null,
      avgCls: clsCount ? clsSum / clsCount : null,
      avgSessionDuration: durCount ? durSum / durCount : null,
      bounceRate: uniqueSessions ? Math.round((1 - engaged.size / uniqueSessions) * 100) / 100 : null,
    };
  }

  async timeSeries(params: QueryParams, interval: string): Promise<TimeSeriesPoint[]> {
    const filtered = this.records.filter((r) => matches(r, params));
    const buckets = new Map<string, StoredRecord[]>();
    const unit = intervalToMs(interval);
    for (const r of filtered) {
      const bucketStart = Math.floor(r.timestamp / unit) * unit;
      const key = new Date(bucketStart).toISOString();
      const arr = buckets.get(key) ?? [];
      arr.push(r);
      buckets.set(key, arr);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, recs]) => {
        let loadSum = 0;
        let loadCount = 0;
        let lcpSum = 0;
        let lcpCount = 0;
        let clsSum = 0;
        let clsCount = 0;
        const sessions = new Set<string>();
        for (const r of recs) {
          sessions.add(r.sessionId);
          const load = num(r.data.performance?.navigationTiming?.loadTime);
          if (load !== null) {
            loadSum += load;
            loadCount++;
          }
          const lcp = num(r.data.performance?.largestContentfulPaint);
          if (lcp !== null) {
            lcpSum += lcp;
            lcpCount++;
          }
          const cls = num(r.data.performance?.cumulativeLayoutShift);
          if (cls !== null) {
            clsSum += cls;
            clsCount++;
          }
        }
        return {
          bucket,
          visits: recs.length,
          sessions: sessions.size,
          avgLoadTime: loadCount ? loadSum / loadCount : null,
          avgLcp: lcpCount ? lcpSum / lcpCount : null,
          avgCls: clsCount ? clsSum / clsCount : null,
          bounceRate: null,
        };
      });
  }

  async breakdown(params: QueryParams, dimension: string): Promise<BreakdownRow[]> {
    const accessor = BREAKDOWN_ACCESSORS[dimension];
    if (!accessor) throw new Error(`Unknown breakdown dimension: ${dimension}`);
    const filtered = this.records.filter((r) => matches(r, params));
    const counts = new Map<string, number>();
    for (const r of filtered) {
      const key = accessor(r) ?? "unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);
  }

  async deleteByFilter(filter: DeleteFilter): Promise<number> {
    const before = this.records.length;
    this.records = this.records.filter((r) => !matchFilter(r, filter));
    return before - this.records.length;
  }

  async exportByFilter(filter: DeleteFilter): Promise<StoredRecord[]> {
    return this.records.filter((r) => matchFilter(r, filter));
  }

  async count(): Promise<number> {
    return this.records.length;
  }

  async purgeOlderThan(cutoff: Date): Promise<number> {
    const before = this.records.length;
    const cutoffMs = cutoff.getTime();
    this.records = this.records.filter((r) => r.timestamp >= cutoffMs);
    return before - this.records.length;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.records = [];
  }
}

function matchFilter(r: StoredRecord, filter: DeleteFilter): boolean {
  if (r.projectId !== filter.projectId) return false;
  if (filter.sessionId && r.sessionId !== filter.sessionId) return false;
  if (filter.customDataKey && filter.customDataValue) {
    const custom = r.data.metadata?.customData ?? {};
    if (String(custom[filter.customDataKey]) !== filter.customDataValue) return false;
  }
  return true;
}

function intervalToMs(interval: string): number {
  switch (interval) {
    case "hour":
      return 60 * 60 * 1000;
    case "week":
      return 7 * 24 * 60 * 60 * 1000;
    case "month":
      return 30 * 24 * 60 * 60 * 1000;
    case "day":
    default:
      return 24 * 60 * 60 * 1000;
  }
}

export { enrich };
