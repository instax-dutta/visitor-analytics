"use client";

import type { RawRecord } from "@/lib/types";

export function DataTable({ records }: { records: RawRecord[] }) {
  if (records.length === 0) return <div className="muted">No records in range</div>;
  return (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Session</th>
          <th>Page</th>
          <th>Device</th>
          <th>Browser</th>
          <th>OS</th>
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <tr key={r.id}>
            <td>{new Date(r.timestamp).toLocaleString()}</td>
            <td>{r.sessionId}</td>
            <td>{r.pagePath}</td>
            <td>{r.formFactor}</td>
            <td>{r.browserName}</td>
            <td>{r.os}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
