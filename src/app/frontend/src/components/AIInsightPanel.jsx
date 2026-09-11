"use client";

import { useRouter } from "next/navigation";
import { IconInfo } from "./Icons";

export default function AIInsightPanel({ anomaly }) {
  const router = useRouter();

  if (!anomaly) {
    return (
      <div
        className="card"
        style={{
          padding: "16px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 12.5,
        }}
      >
        No active anomaly to inspect.
      </div>
    );
  }

  const probabilityPct = Math.round((anomaly.anomaly_score ?? anomaly.anomalyScore ?? 0.94) * 100);
  const confidencePct = Math.round((anomaly.confidence ?? 0.88) * 100);
  const sId = anomaly.stationId || anomaly.station_id;

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        height: "100%",
        borderLeft: "3px solid var(--status-critical)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <IconInfo size={14} color="var(--accent)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.5px" }}>
          DIAGNOSTIC EVIDENCE
        </span>
      </div>

      <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: "0 0 12px 0", color: "var(--text)" }}>
        <span className="data-mono" style={{ fontWeight: 600, color: "var(--accent)" }}>{sId}</span> is showing an abnormal reading compared with its recent baseline.
      </p>

      <MetricBar label="Isolation Forest Score" pct={probabilityPct} color="var(--status-critical)" />
      <MetricBar label="Model Confidence" pct={confidencePct} color="var(--status-normal)" />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: "6px" }}>
        <span style={{ color: "var(--text-muted)" }}>Deviation from baseline:</span>
        <span className="data-mono" style={{ color: "var(--status-critical)", fontWeight: 600 }}>
          {anomaly.deviation || `+${anomaly.deviation_from_baseline || 17.8}°C`}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "14px" }}>
        Physical rule:{" "}
        <span style={{ color: "var(--text)", fontWeight: 500 }}>
          {(anomaly.rootCause || anomaly.root_cause || "temperature_sensor_fault").replaceAll("_", " ")}
        </span>
      </div>

      <button
        onClick={() => router.push(`/dashboard/stations/${sId}`)}
        className="btn btn-primary"
        style={{ marginTop: "auto", alignSelf: "flex-start" }}
      >
        View station telemetry &rarr;
      </button>
    </div>
  );
}

function MetricBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
        <span>{label}</span>
        <span className="data-mono" style={{ color: "var(--text)", fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--bg)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}
