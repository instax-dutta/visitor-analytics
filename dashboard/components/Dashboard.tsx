"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "./KpiCard";
import { LineChart } from "./LineChart";
import { BarChart } from "./BarChart";
import { DataTable } from "./DataTable";
import { TimeRangeSelector } from "./TimeRangeSelector";
import type { AnalyticsQuery, BreakdownRow, DashboardSummary, RawRecord, TimeSeriesPoint } from "@/lib/types";

const PRESETS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

const DIMENSIONS = ["browser", "os", "formFactor", "network", "utmSource", "pagePath"];

interface Payload {
  summary: DashboardSummary;
  points: TimeSeriesPoint[];
  breakdown: BreakdownRow[];
  records: RawRecord[];
}

export function Dashboard() {
  const [range, setRange] = useState<string>("7d");
  const [dimension, setDimension] = useState<string>("browser");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const since = useMemo(() => Date.now() - (PRESETS[range] ?? PRESETS["7d"]), [range]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        since: String(since),
        interval: range === "24h" ? "hour" : range === "90d" ? "week" : "day",
        dimension,
      });
      try {
        const res = await fetch(`/api/analytics?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed: ${res.status}`);
        }
        const json = (await res.json()) as Payload;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [since, range, dimension]);

  const query: AnalyticsQuery = { since, dimension };

  return (
    <>
      <div className="header">
        <div>
          <h1>Visitor Analytics</h1>
          <div className="muted">Privacy-first, real-time web analytics</div>
        </div>
        <div className="controls">
          <TimeRangeSelector value={range} onChange={setRange} />
          <select value={dimension} onChange={(e) => setDimension(e.target.value)} aria-label="Breakdown dimension">
            {DIMENSIONS.map((d) => (
              <option key={d} value={d}>
                By {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && !data && <div className="muted">Loading…</div>}

      {data && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Visits" value={data.summary.totalVisits.toLocaleString()} />
            <KpiCard label="Sessions" value={data.summary.uniqueSessions.toLocaleString()} />
            <KpiCard label="Avg Load (ms)" value={fmt(data.summary.avgLoadTime)} />
            <KpiCard label="Avg LCP (ms)" value={fmt(data.summary.avgLcp)} />
            <KpiCard label="Avg CLS" value={fmt(data.summary.avgCls)} />
            <KpiCard label="Bounce Rate" value={data.summary.bounceRate === null ? "—" : `${Math.round(data.summary.bounceRate * 100)}%`} />
          </div>

          <div className="panel">
            <h2>Visits over time</h2>
            <LineChart
              data={data.points.map((p) => ({
                label: new Date(p.bucket).toLocaleDateString(),
                values: { Visits: p.visits, Sessions: p.sessions },
              }))}
              series={[
                { key: "Visits", color: "#4c8dff" },
                { key: "Sessions", color: "#2ea043" },
              ]}
            />
          </div>

          <div className="panel">
            <h2>Top {dimension}</h2>
            <BarChart data={data.breakdown} />
          </div>

          <div className="panel">
            <h2>Recent records</h2>
            <DataTable records={data.records.slice(0, 25)} />
          </div>

          <div className="controls">
            <button className="ghost" onClick={() => exportCsv(data.records)}>
              Export CSV
            </button>
            <button className="ghost" onClick={() => exportJson(data)}>
              Export JSON
            </button>
          </div>
        </>
      )}
    </>
  );
}

function fmt(n: number | null): string {
  if (n === null) return "—";
  return Math.round(n).toLocaleString();
}

function exportCsv(records: RawRecord[]) {
  const headers = ["timestamp", "sessionId", "pagePath", "formFactor", "browserName", "os"];
  const rows = records.map((r) => [
    new Date(r.timestamp).toISOString(),
    r.sessionId,
    r.pagePath,
    r.formFactor,
    r.browserName,
    r.os,
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  download("visitor-analytics.csv", csv, "text/csv");
}

function exportJson(payload: Payload) {
  download("visitor-analytics.json", JSON.stringify(payload, null, 2), "application/json");
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
