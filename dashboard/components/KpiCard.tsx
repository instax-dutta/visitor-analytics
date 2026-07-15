"use client";

export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
