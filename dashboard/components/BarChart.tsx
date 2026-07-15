"use client";

import type { BreakdownRow } from "@/lib/types";

export function BarChart({ data }: { data: BreakdownRow[] }) {
  if (data.length === 0) return <div className="muted">No data in range</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.slice(0, 12).map((row) => (
        <div className="bar-row" key={row.key}>
          <span style={{ width: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.key}
          </span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <span style={{ minWidth: 48, textAlign: "right" }}>{row.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
