"use client";

import { useRouter } from "next/navigation";
import RelativeTime from "./RelativeTime";
import { statusFromScore } from "./StatusBadge";

const TAG_META = {
  critical: { label: "Critical", color: "var(--status-critical)", bg: "var(--status-critical-dim)" },
  warning: { label: "Warning", color: "var(--status-warning)", bg: "var(--status-warning-dim)" },
  normal: { label: "Normal", color: "var(--status-normal)", bg: "var(--status-normal-dim)" },
};

export default function AnomalyTable({ anomalies, dense = false, onRowClick, selectedId }) {
  const router = useRouter();
  const handleClick = onRowClick || ((a) => router.push(`/dashboard/stations/${a.station_id}`));

  if (anomalies.length === 0) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: 13 }}>
        No anomalies detected. All stations reporting normally.
      </div>
    );
  }

  return (
    <table className="notion-table">
      <thead>
        <tr>
          <th>Station</th>
          <th>Severity</th>
          <th>Root cause</th>
          <th>Confidence</th>
          <th>Detected</th>
          {!dense && <th></th>}
        </tr>
      </thead>
      <tbody>
        {anomalies.map((a) => {
          const id = a.station_id + a.timestamp;
          const meta = TAG_META[statusFromScore(a.severity)];
          return (
            <tr
              key={id}
              className="row-hover"
              style={{ cursor: "pointer", background: selectedId === id ? "var(--surface-hover)" : undefined }}
              onClick={() => handleClick(a)}
            >
              <td>
                <span className="inline-code">{a.station_id}</span>
              </td>
              <td>
                <span className="tag" style={{ color: meta.color, background: meta.bg }}>
                  {meta.label}
                </span>
              </td>
              <td style={{ color: "var(--text-muted)" }}>{a.root_cause.replaceAll("_", " ")}</td>
              <td>{Math.round(a.confidence * 100)}%</td>
              <td style={{ color: "var(--text-muted)" }}>
                <RelativeTime timestamp={a.timestamp} />
              </td>
              {!dense && (
                <td>
                  <span style={{ color: "var(--accent-blue)", fontSize: 12 }}>Open &rarr;</span>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
