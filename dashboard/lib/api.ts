import type {
  AnalyticsQuery,
  BreakdownRow,
  DashboardSummary,
  RawRecord,
  TimeSeriesPoint,
} from "./types.js";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const BACKEND_API_KEY = process.env.BACKEND_API_KEY ?? "";

function authHeaders(): Record<string, string> {
  return { "X-API-Key": BACKEND_API_KEY, Accept: "application/json" };
}

function buildQuery(params: AnalyticsQuery): string {
  const sp = new URLSearchParams();
  if (params.since !== undefined) sp.set("since", String(params.since));
  if (params.until !== undefined) sp.set("until", String(params.until));
  if (params.pagePath) sp.set("pagePath", params.pagePath);
  if (params.sessionId) sp.set("sessionId", params.sessionId);
  if (params.interval) sp.set("interval", params.interval);
  if (params.dimension) sp.set("dimension", params.dimension);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchSummary(q: AnalyticsQuery): Promise<DashboardSummary> {
  const res = await fetch(`${BACKEND_URL}/api/v1/summary${buildQuery(q)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`summary failed: ${res.status}`);
  return (await res.json()) as DashboardSummary;
}

export async function fetchTimeSeries(q: AnalyticsQuery): Promise<TimeSeriesPoint[]> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/timeseries${buildQuery({ ...q, interval: q.interval ?? "day" })}`,
    { headers: authHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`timeseries failed: ${res.status}`);
  const body = (await res.json()) as { points: TimeSeriesPoint[] };
  return body.points;
}

export async function fetchBreakdown(q: AnalyticsQuery): Promise<BreakdownRow[]> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/breakdown${buildQuery({ ...q, dimension: q.dimension ?? "browser" })}`,
    { headers: authHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`breakdown failed: ${res.status}`);
  const body = (await res.json()) as { rows: BreakdownRow[] };
  return body.rows;
}

export async function fetchRecords(q: AnalyticsQuery): Promise<RawRecord[]> {
  const res = await fetch(`${BACKEND_URL}/api/v1/records${buildQuery(q)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`records failed: ${res.status}`);
  const body = (await res.json()) as { records: RawRecord[] };
  return body.records;
}
