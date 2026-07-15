"use client";

export interface LinePoint {
  label: string;
  values: Record<string, number>;
}

export interface LineSeries {
  key: string;
  color: string;
}

const W = 720;
const H = 260;
const PAD = 40;

export function LineChart({ data, series }: { data: LinePoint[]; series: LineSeries[] }) {
  if (data.length === 0) return <div className="muted">No data in range</div>;

  const allValues = data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0));
  const max = Math.max(1, ...allValues);
  const xStep = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#2a3140" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#2a3140" />
      {series.map((s) => {
        const path = data
          .map((d, i) => {
            const x = PAD + i * xStep;
            const yy = y(d.values[s.key] ?? 0);
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yy.toFixed(1)}`;
          })
          .join(" ");
        return <path key={s.key} d={path} fill="none" stroke={s.color} strokeWidth={2} />;
      })}
      {data.map((d, i) =>
        i % Math.ceil(data.length / 8) === 0 ? (
          <text key={d.label} x={PAD + i * xStep} y={H - PAD + 16} fill="#8b949e" fontSize={10} textAnchor="middle">
            {d.label}
          </text>
        ) : null
      )}
      {[0, 0.5, 1].map((f) => (
        <text key={f} x={PAD - 8} y={y(max * f) + 4} fill="#8b949e" fontSize={10} textAnchor="end">
          {Math.round(max * f)}
        </text>
      ))}
    </svg>
  );
}
