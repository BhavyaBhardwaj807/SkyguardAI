"use client";

import { useRouter } from "next/navigation";
import RelativeTime from "./RelativeTime";
import StatusBadge from "./StatusBadge";

export default function AnomalyTable({ anomalies = [], dense = false, onRowClick, selectedId }) {
  const router = useRouter();
  const handleClick = onRowClick || ((a) => router.push(`/dashboard/stations/${a.stationId || a.station_id}`));

  if (anomalies.length === 0) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: 12 }}>
        No anomalies detected. All stations reporting normally.
      </div>
    );
  }

  return (
    <div className="table-container" style={{ border: "none" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Station</th>
            <th>QC Verdict</th>
            <th>Physical Reason</th>
            <th>Score</th>
            <th>Detected</th>
            {!dense && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {anomalies.map((a) => {
            const sId = a.stationId || a.station_id;
            const id = a.id || sId + a.timestamp;
            return (
              <tr
                key={id}
                style={{
                  cursor: "pointer",
                  background: selectedId === id ? "var(--surface-hover)" : undefined,
                }}
                onClick={() => handleClick(a)}
              >
                <td>
                  <span className="data-mono" style={{ fontWeight: 600, color: "var(--accent)" }}>
                    {sId}
                  </span>
                </td>
                <td>
                  <StatusBadge verdict={a.verdict || a.severity} />
                </td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {(a.rootCause || a.root_cause || "sensor_spike").replaceAll("_", " ")}
                </td>
                <td className="data-mono" style={{ fontWeight: 600 }}>
                  {a.anomalyScore ?? a.anomaly_score ?? "0.94"}
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  <RelativeTime timestamp={a.timestamp} />
                </td>
                {!dense && (
                  <td>
                    <span style={{ color: "var(--accent)", fontSize: "11.5px" }}>Inspect &rarr;</span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
