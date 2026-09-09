"use client";
"use client";
import { AlertTriangle, Filter, MoreHorizontal, CheckCircle } from "lucide-react";

const mockAnomalies = [
  { id: "AN-102", station: "AWS_001", type: "Temperature Spike", severity: "High", time: "10 mins ago", status: "Active" },
  { id: "AN-103", station: "AWS_004", type: "Sensor Disconnect", severity: "Critical", time: "25 mins ago", status: "Active" },
  { id: "AN-104", station: "AWS_002", type: "Voltage Drop", severity: "Medium", time: "1 hour ago", status: "Resolved" },
  { id: "AN-105", station: "AWS_008", type: "Data Gap", severity: "Low", time: "2 hours ago", status: "Active" },
  { id: "AN-106", station: "AWS_001", type: "High Humidity", severity: "Medium", time: "3 hours ago", status: "Resolved" },
  { id: "AN-107", station: "AWS_005", type: "Calibration Error", severity: "High", time: "5 hours ago", status: "Active" },
];

export default function AnomalyList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>Active Anomalies</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "8px 16px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text)" }}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: "var(--space-5)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13 }}>
              <th style={{ paddingBottom: 16, fontWeight: 500 }}>ID</th>
              <th style={{ paddingBottom: 16, fontWeight: 500 }}>Station</th>
              <th style={{ paddingBottom: 16, fontWeight: 500 }}>Anomaly Type</th>
              <th style={{ paddingBottom: 16, fontWeight: 500 }}>Severity</th>
              <th style={{ paddingBottom: 16, fontWeight: 500 }}>Time</th>
              <th style={{ paddingBottom: 16, fontWeight: 500 }}>Status</th>
              <th style={{ paddingBottom: 16, fontWeight: 500 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {mockAnomalies.map((a, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border-soft)", fontSize: 14 }}>
                <td style={{ padding: "16px 0", fontWeight: 600 }}>{a.id}</td>
                <td style={{ padding: "16px 0", color: "var(--text-muted)" }}>{a.station}</td>
                <td style={{ padding: "16px 0" }}>{a.type}</td>
                <td style={{ padding: "16px 0" }}>
                  <span className={`badge ${a.severity === 'Critical' ? 'badge-red' : a.severity === 'High' ? 'badge-red' : 'badge-green'}`} style={{ background: a.severity === 'Medium' ? 'rgba(251, 191, 36, 0.1)' : undefined, color: a.severity === 'Medium' ? 'var(--yellow)' : undefined }}>
                    {a.severity}
                  </span>
                </td>
                <td style={{ padding: "16px 0", color: "var(--text-muted)", fontSize: 13 }}>{a.time}</td>
                <td style={{ padding: "16px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: a.status === 'Active' ? 'var(--orange)' : 'var(--green)' }}>
                    {a.status === 'Active' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />} {a.status}
                  </div>
                </td>
                <td style={{ padding: "16px 0" }}>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
