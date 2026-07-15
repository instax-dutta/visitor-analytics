import { Pool } from "pg";
import type { AnalyticsRecordDTO } from "../schema.js";
import { metrics } from "../metrics.js";
import { projectIdFromApiKey } from "./enrich.js";
import type {
  BreakdownRow,
  DashboardSummary,
  DeleteFilter,
  QueryParams,
  Storage,
  StoredRecord,
  TimeSeriesPoint,
} from "./types.js";

const BREAKDOWN_COLUMNS: Record<string, string> = {
  formFactor: "form_factor",
  browser: "browser_name",
  os: "os",
  network: "effective_type",
  utmSource: "utm_source",
  utmMedium: "utm_medium",
  utmCampaign: "utm_campaign",
  pagePath: "page_path",
  referrer: "referrer",
};

const INTERVAL_UNITS: Record<string, string> = {
  hour: "hour",
  day: "day",
  week: "week",
  month: "month",
};

function buildWhere(params: QueryParams): { clause: string; args: unknown[] } {
  const conditions: string[] = ["project_id = $1"];
  const args: unknown[] = [params.projectId];
  let idx = 2;
  if (params.since !== undefined) {
    conditions.push(`timestamp >= $${idx++}`);
    args.push(params.since);
  }
  if (params.until !== undefined) {
    conditions.push(`timestamp <= $${idx++}`);
    args.push(params.until);
  }
  if (params.pagePath) {
    conditions.push(`page_path = $${idx++}`);
    args.push(params.pagePath);
  }
  if (params.sessionId) {
    conditions.push(`session_id = $${idx++}`);
    args.push(params.sessionId);
  }
  return { clause: conditions.join(" AND "), args };
}

export class PostgresStorage implements Storage {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10 });
  }

  async init(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async insertBatch(records: StoredRecord[]): Promise<number> {
    if (records.length === 0) return 0;
    const columns = [
      "id",
      "project_id",
      "session_id",
      "timestamp",
      "page_path",
      "referrer",
      "schema_version",
      "form_factor",
      "browser_name",
      "os",
      "effective_type",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "data",
    ];
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let p = 1;
    for (const r of records) {
      const row = [
        r.id,
        r.projectId,
        r.sessionId,
        r.timestamp,
        r.pagePath,
        r.referrer,
        r.schemaVersion,
        r.formFactor,
        r.browserName,
        r.os,
        r.effectiveType,
        r.utmSource,
        r.utmMedium,
        r.utmCampaign,
        JSON.stringify(r.data),
      ];
      const cols = row.map(() => `$${p++}`);
      placeholders.push(`(${cols.join(",")})`);
      values.push(...row);
    }
    const sql = `INSERT INTO analytics_records (${columns.join(",")})
      VALUES ${placeholders.join(",")}
      ON CONFLICT (project_id, id) DO NOTHING`;
    const end = metrics.dbQueryDurationSeconds.startTimer({ operation: "insertBatch" });
    try {
      const res = await this.pool.query(sql, values);
      return res.rowCount ?? 0;
    } finally {
      end();
    }
  }

  async query(params: QueryParams): Promise<StoredRecord[]> {
    const { clause, args } = buildWhere(params);
    const limit = Math.min(params.limit ?? 100, 1000);
    const offset = params.offset ?? 0;
    const sql = `SELECT id, project_id, session_id, timestamp, page_path, referrer,
        schema_version, form_factor, browser_name, os, effective_type,
        utm_source, utm_medium, utm_campaign, data, created_at
      FROM analytics_records WHERE ${clause}
      ORDER BY timestamp DESC LIMIT $${args.length + 1} OFFSET $${args.length + 2}`;
    const end = metrics.dbQueryDurationSeconds.startTimer({ operation: "query" });
    try {
      const res = await this.pool.query(sql, [...args, limit, offset]);
      return res.rows.map(mapRow);
    } finally {
      end();
    }
  }

  async summary(params: QueryParams): Promise<DashboardSummary> {
    const { clause, args } = buildWhere(params);
    const sql = `SELECT
        COUNT(*) AS total_visits,
        COUNT(DISTINCT session_id) AS unique_sessions,
        AVG((data->'performance'->'navigationTiming'->>'loadTime')::double precision) AS avg_load_time,
        AVG((data->'performance'->>'largestContentfulPaint')::double precision) AS avg_lcp,
        AVG((data->'performance'->>'cumulativeLayoutShift')::double precision) AS avg_cls,
        AVG((data->'interaction'->>'sessionDuration')::double precision) AS avg_session_duration,
        COUNT(DISTINCT CASE WHEN (data->'interaction'->>'routeChanges')::int > 0 THEN session_id END) AS engaged_sessions
      FROM analytics_records WHERE ${clause}`;
    const end = metrics.dbQueryDurationSeconds.startTimer({ operation: "summary" });
    try {
      const res = await this.pool.query(sql, args);
      const row = res.rows[0] ?? {};
      const uniqueSessions = Number(row.unique_sessions ?? 0);
      const engaged = Number(row.engaged_sessions ?? 0);
      return {
        totalVisits: Number(row.total_visits ?? 0),
        uniqueSessions,
        avgLoadTime: numOrNull(row.avg_load_time),
        avgLcp: numOrNull(row.avg_lcp),
        avgCls: numOrNull(row.avg_cls),
        avgSessionDuration: numOrNull(row.avg_session_duration),
        bounceRate:
          uniqueSessions > 0 ? round2(1 - engaged / uniqueSessions) : null,
      };
    } finally {
      end();
    }
  }

  async timeSeries(params: QueryParams, interval: string): Promise<TimeSeriesPoint[]> {
    const unit = INTERVAL_UNITS[interval] ?? "day";
    const { clause, args } = buildWhere(params);
    const sql = `SELECT
        date_trunc('${unit}', to_timestamp(timestamp/1000)) AS bucket,
        COUNT(*) AS visits,
        COUNT(DISTINCT session_id) AS sessions,
        AVG((data->'performance'->'navigationTiming'->>'loadTime')::double precision) AS avg_load_time,
        AVG((data->'performance'->>'largestContentfulPaint')::double precision) AS avg_lcp,
        AVG((data->'performance'->>'cumulativeLayoutShift')::double precision) AS avg_cls
      FROM analytics_records WHERE ${clause}
      GROUP BY bucket ORDER BY bucket ASC`;
    const end = metrics.dbQueryDurationSeconds.startTimer({ operation: "timeSeries" });
    try {
      const res = await this.pool.query(sql, args);
      return res.rows.map((r) => ({
        bucket: new Date(r.bucket).toISOString(),
        visits: Number(r.visits),
        sessions: Number(r.sessions),
        avgLoadTime: numOrNull(r.avg_load_time),
        avgLcp: numOrNull(r.avg_lcp),
        avgCls: numOrNull(r.avg_cls),
        bounceRate: null,
      }));
    } finally {
      end();
    }
  }

  async breakdown(params: QueryParams, dimension: string): Promise<BreakdownRow[]> {
    const col = BREAKDOWN_COLUMNS[dimension];
    if (!col) throw new Error(`Unknown breakdown dimension: ${dimension}`);
    const { clause, args } = buildWhere(params);
    const sql = `SELECT ${col} AS key, COUNT(*) AS value
      FROM analytics_records WHERE ${clause}
      GROUP BY ${col} ORDER BY value DESC LIMIT 50`;
    const end = metrics.dbQueryDurationSeconds.startTimer({ operation: "breakdown" });
    try {
      const res = await this.pool.query(sql, args);
      return res.rows.map((r) => ({ key: r.key ?? "unknown", value: Number(r.value) }));
    } finally {
      end();
    }
  }

  async deleteByFilter(filter: DeleteFilter): Promise<number> {
    const conditions = ["project_id = $1"];
    const args: unknown[] = [filter.projectId];
    let idx = 2;
    if (filter.sessionId) {
      conditions.push(`session_id = $${idx++}`);
      args.push(filter.sessionId);
    }
    if (filter.customDataKey && filter.customDataValue) {
      conditions.push(`data->'metadata'->'customData'->>$${idx} = $${idx + 1}`);
      args.push(filter.customDataKey, filter.customDataValue);
      idx += 2;
    }
    const sql = `DELETE FROM analytics_records WHERE ${conditions.join(" AND ")}`;
    const end = metrics.dbQueryDurationSeconds.startTimer({ operation: "delete" });
    try {
      const res = await this.pool.query(sql, args);
      return res.rowCount ?? 0;
    } finally {
      end();
    }
  }

  async exportByFilter(filter: DeleteFilter): Promise<StoredRecord[]> {
    const conditions = ["project_id = $1"];
    const args: unknown[] = [filter.projectId];
    let idx = 2;
    if (filter.sessionId) {
      conditions.push(`session_id = $${idx++}`);
      args.push(filter.sessionId);
    }
    if (filter.customDataKey && filter.customDataValue) {
      conditions.push(`data->'metadata'->'customData'->>$${idx} = $${idx + 1}`);
      args.push(filter.customDataKey, filter.customDataValue);
      idx += 2;
    }
    const sql = `SELECT id, project_id, session_id, timestamp, page_path, referrer,
        schema_version, form_factor, browser_name, os, effective_type,
        utm_source, utm_medium, utm_campaign, data, created_at
      FROM analytics_records WHERE ${conditions.join(" AND ")} LIMIT 100000`;
    const res = await this.pool.query(sql, args);
    return res.rows.map(mapRow);
  }

  async count(): Promise<number> {
    const res = await this.pool.query("SELECT COUNT(*) AS c FROM analytics_records");
    return Number(res.rows[0]?.c ?? 0);
  }

  async purgeOlderThan(cutoff: Date): Promise<number> {
    const end = metrics.dbQueryDurationSeconds.startTimer({ operation: "purge" });
    try {
      const res = await this.pool.query(
        "DELETE FROM analytics_records WHERE timestamp < $1",
        [cutoff.getTime()]
      );
      return res.rowCount ?? 0;
    } finally {
      end();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function mapRow(r: Record<string, unknown>): StoredRecord {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    sessionId: String(r.session_id),
    timestamp: Number(r.timestamp),
    pagePath: String(r.page_path),
    referrer: String(r.referrer ?? ""),
    schemaVersion: Number(r.schema_version ?? 1),
    formFactor: String(r.form_factor ?? "unknown"),
    browserName: String(r.browser_name ?? "unknown"),
    os: String(r.os ?? "unknown"),
    effectiveType: String(r.effective_type ?? "unknown"),
    utmSource: (r.utm_source as string) ?? null,
    utmMedium: (r.utm_medium as string) ?? null,
    utmCampaign: (r.utm_campaign as string) ?? null,
    data: JSON.parse(String(r.data)) as AnalyticsRecordDTO,
    createdAt: r.created_at as Date,
  };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export { projectIdFromApiKey };
