"use client";

import { useEffect, useState, useCallback } from "react";
import { IconRefresh, IconInfo } from "../../../components/Icons";
import { api } from "../../../api/client";

function pct(v) {
  if (v == null) return "—";
  return (v * 100).toFixed(1) + "%";
}
function fmt(v, decimals = 3) {
  if (v == null) return "—";
  return v.toFixed(decimals);
}

export default function ModelEvaluationPage() {
  const [evalData, setEvalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getEvaluationMetrics();
      setEvalData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>
        Loading model validation metrics…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--status-critical)", marginBottom: 12 }}>Failed to load: {error}</p>
        <button className="btn" onClick={load}>Retry</button>
      </div>
    );
  }

  const m  = evalData?.metrics ?? {};
  const ms = evalData?.multiSeedSummary ?? {};
  const rt = evalData?.regionalTest ?? {};

  // Summary metric cards derived from real data
  const summaryCards = [
    { label: "Precision",         value: pct(m.precision),              sub: "True faults / total flagged",        color: "var(--status-normal)" },
    { label: "Recall",            value: pct(m.recall),                  sub: "Detected faults / all anomalies",    color: "var(--accent)" },
    { label: "F1 Score",          value: fmt(m.f1),                      sub: "Harmonic mean",                      color: "var(--text)" },
    { label: "PR-AUC",            value: fmt(m.pr_auc),                  sub: "Precision-recall area",              color: "var(--text)" },
    { label: "ROC-AUC",           value: fmt(m.roc_auc),                 sub: "Discriminative power",               color: "var(--text)" },
    { label: "False Alarm Rate",  value: pct(m.false_alarm_rate),        sub: "FP rate on normal data",             color: (m.false_alarm_rate ?? 0) > 0.05 ? "var(--status-warning)" : "var(--text)" },
  ];

  // Multi-seed rows
  const seedRows = [
    { metric: "Precision", mean: ms.precision?.mean, std: ms.precision?.std },
    { metric: "Recall",    mean: ms.recall?.mean,    std: ms.recall?.std },
    { metric: "F1",        mean: ms.f1?.mean,        std: ms.f1?.std },
    { metric: "PR-AUC",    mean: ms.pr_auc?.mean,    std: ms.pr_auc?.std },
    { metric: "ROC-AUC",   mean: ms.roc_auc?.mean,   std: ms.roc_auc?.std },
    { metric: "False Alarm Rate", mean: ms.false_alarm_rate?.mean, std: ms.false_alarm_rate?.std },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.01em" }}>
            Model Validation &amp; Performance
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "6px 0 0 0", lineHeight: 1.5 }}>
            Saved evaluation metrics for{" "}
            <span className="data-mono" style={{ color: "var(--accent)", fontSize: 14 }}>
              {evalData?.modelVersion ?? "—"}
            </span>
          </p>
        </div>
        <button className="btn" onClick={load} disabled={isLoading}>
          <IconRefresh size={14} /><span>Refresh</span>
        </button>
      </div>

      {/* ── Primary metric cards ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {summaryCards.map((c) => (
          <div key={c.label} className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", fontWeight: 500 }}>{c.label}</div>
            <div className="data-mono" style={{ fontSize: 28, fontWeight: 700, color: c.color, marginTop: 6 }}>
              {c.value}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Multi-seed + regional test ───────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Multi-seed stability table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)",
            background: "var(--surface)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              Multi-Seed Stability Summary
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Mean ± std across seeds</span>
          </div>
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr><th>Metric</th><th>Mean</th><th>Std Dev</th></tr>
              </thead>
              <tbody>
                {seedRows.map((r) => (
                  <tr key={r.metric}>
                    <td style={{ color: "var(--text)", fontWeight: 500 }}>{r.metric}</td>
                    <td className="data-mono">{fmt(r.mean)}</td>
                    <td className="data-mono" style={{ color: "var(--text-muted)" }}>±{fmt(r.std)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Provenance + regional test + limitations */}
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>
            Evaluation Provenance
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
            {[
              { label: "Model version",    value: evalData?.modelVersion ?? "—" },
              { label: "Regional FP test", value: rt.status === "not_evaluated"
                  ? "Not evaluated (0 regional samples)"
                  : `${rt.falsePositives} FP of ${rt.sampleCount} samples` },
              { label: "Regional samples", value: rt.sampleCount?.toString() ?? "0" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between",
                borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                <span style={{ color: "var(--text-muted)" }}>{label}:</span>
                <span className="data-mono" style={{ color: "var(--text)", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Limitations */}
          {evalData?.limitations?.length > 0 && (
            <div style={{ padding: 14, background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6,
                color: "var(--text)", fontWeight: 600, marginBottom: 8 }}>
                <IconInfo size={14} color="var(--accent)" />
                <span>Known Limitations</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {evalData.limitations.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
