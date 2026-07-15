"use client";

export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = ["24h", "7d", "30d", "90d"];
  return (
    <div className="controls">
      {options.map((o) => (
        <button
          key={o}
          className={o === value ? "active" : ""}
          onClick={() => onChange(o)}
          aria-pressed={o === value}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
