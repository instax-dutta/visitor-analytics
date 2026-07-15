import { NextResponse } from "next/server";
import { fetchBreakdown, fetchRecords, fetchSummary, fetchTimeSeries } from "@/lib/api";
import type { AnalyticsQuery } from "@/lib/types";

function parseQuery(url: URL): AnalyticsQuery {
  const p = url.searchParams;
  const num = (k: string) => {
    const v = p.get(k);
    return v && v.length > 0 ? Number(v) : undefined;
  };
  return {
    since: num("since"),
    until: num("until"),
    pagePath: p.get("pagePath") ?? undefined,
    sessionId: p.get("sessionId") ?? undefined,
    interval: p.get("interval") ?? undefined,
    dimension: p.get("dimension") ?? undefined,
  };
}

// Server-side proxy that fans out to the backend and keeps the API key hidden
// from the browser. Returns a single combined payload for the dashboard.
export async function GET(req: Request) {
  const q = parseQuery(new URL(req.url));
  try {
    const [summary, points, breakdown, records] = await Promise.all([
      fetchSummary(q),
      fetchTimeSeries(q),
      fetchBreakdown(q),
      fetchRecords(q),
    ]);
    return NextResponse.json({ summary, points, breakdown, records });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
