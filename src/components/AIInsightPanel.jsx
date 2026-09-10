"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AIInsightPanel({ anomaly }) {
  const router = useRouter();

  if (!anomaly) {
    return (
      <div className="callout" style={{ background: "var(--surface-hover)", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
        No active anomaly to analyze.
      </div>
    );
  }

  const probabilityPct = Math.round(anomaly.anomaly_score * 100);
  const confidencePct = Math.round(anomaly.confidence * 100);

  return (
    <div
      className="callout"
      style={{
        flexDirection: "column",
        background: "var(--accent-blue-dim)",
        borderColor: "var(--border)",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <Sparkles size={15} color="var(--accent-blue)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>AI Insight</span>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 var(--space-3)", color: "var(--text)" }}>
        <span className="inline-code">{anomaly.station_id}</span> is showing an abnormal reading compared with its
        recent baseline.
      </p>

      <MetricBar label="Anomaly probability" pct={probabilityPct} color="var(--status-critical)" />
      <MetricBar label="Model confidence" pct={confidencePct} color="var(--status-normal)" />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: "var(--space-2)" }}>
        <span style={{ color: "var(--text-muted)" }}>Deviation from baseline</span>
        <span style={{ color: "var(--text)" }}>+{anomaly.deviation_from_baseline}°C</span>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
        Likely cause: <span style={{ color: "var(--text)" }}>{anomaly.root_cause.replaceAll("_", " ")}</span>
      </div>

      <button
        onClick={() => router.push(`/dashboard/stations/${anomaly.station_id}`)}
        style={{
          marginTop: "auto",
          alignSelf: "flex-start",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 12px",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        View analysis
      </button>
    </div>
  );
}

function MetricBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: "var(--space-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: "var(--text)" }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "var(--surface)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}
