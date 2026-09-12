"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "../../../components/StatusBadge";
import RelativeTime from "../../../components/RelativeTime";
import {
  IconFilter, IconSearch, IconCheck, IconClose,
  IconArrowRight, IconRefresh,
} from "../../../components/Icons";
import { api } from "../../../api/client";

// Backend severity enum: "none" | "low" | "medium" | "high" | "unknown"
const SEVERITY_OPTIONS = [
  { value: "all",    label: "All Severities" },
  { value: "high",   label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low" },
  { value: "none",   label: "None (Normal)" },
];

// Backend verdict enum: normal | suspected_fault | uncertain | insufficient_data
const VERDICT_OPTIONS = [
  { value: "all",              label: "All Verdicts" },
  { value: "suspected_fault",  label: "Suspected Fault" },
  { value: "uncertain",        label: "Uncertain" },
  { value: "normal",           label: "Normal" },
  { value: "insufficient_data",label: "Insufficient Data" },
];

export default function AnomaliesPage() {
  const [assessments,    setAssessments]    = useState([]);
  const [stations,       setStations]       = useState([]);   // for station filter dropdown
  const [corrections,    setCorrections]    = useState([]);   // keyed by assessment_id
  const [filterVerdict,  setFilterVerdict]  = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStation,  setFilterStation]  = useState("all");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [selected,       setSelected]       = useState(null);
  const [reviewed,       setReviewed]       = useState({});   // correctionId → decision
  const [isLoading,      setIsLoading]      = useState(true);
  const [error,          setError]          = useState(null);
  const [runId,          setRunId]          = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const run = await api.getLatestRun();
      const rid = run?.id ?? null;
      setRunId(rid);

      const [stData, aData, cData] = await Promise.all([
        api.getStations(rid),
        rid ? api.getAssessments(rid) : Promise.resolve([]),
        rid ? api.getCorrections(rid) : Promise.resolve([]),
      ]);

      setStations(stData);
      setAssessments(aData);
      setCorrections(cData);

      // Auto-select first non-normal assessment
      const first = aData.find((a) => a.verdict !== "normal") ?? aData[0] ?? null;
      setSelected(first);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (correctionId, decision) => {
    try {
      await api.reviewCorrection(correctionId, decision);
      setReviewed((prev) => ({ ...prev, [correctionId]: decision }));
    } catch (e) {
      // surface error inline
      setError(`Review failed: ${e.message}`);
    }
  };

  // Corrections for the selected assessment
  const selectedCorrections = selected
    ? corrections.filter((c) => c.assessment_id === selected.id)
    : [];

  // Find station name for an assessment
  const stationName = (stationId) =>
    stations.find((s) => s.stationId === stationId)?.name ?? stationId;

  // Client-side filter on top of what we fetched
  const filtered = assessments.filter((a) => {
    if (filterVerdict  !== "all" && a.verdict  !== filterVerdict)  return false;
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterStation  !== "all" && a.stationId !== filterStation) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.stationId.toLowerCase().includes(q) ||
        stationName(a.stationId).toLowerCase().includes(q) ||
        a.explanation?.toLowerCase().includes(q) ||
        a.suspectedCategory?.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.01em" }}>
            Data Quality Incidents
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "6px 0 0 0", lineHeight: 1.5 }}>
            Automated quality assessments and non-destructive correction proposals.
          </p>
        </div>
        <button className="btn" onClick={load} disabled={isLoading}>
          <IconRefresh size={14} /><span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 16px", background: "rgba(239,68,68,0.1)",
          border: "1px solid var(--status-critical)", borderRadius: "var(--radius-md)",
          color: "var(--status-critical)", fontSize: 13.5 }}>
          {error}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "14px 18px", display: "flex",
        alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconFilter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>Filter:</span>
        </div>

        {/* Verdict filter — uses real backend verdict enum */}
        <FilterSelect id="verdict-select" label="Verdict" value={filterVerdict}
          onChange={setFilterVerdict} options={VERDICT_OPTIONS} />

        {/* Severity filter — uses real backend severity enum */}
        <FilterSelect id="severity-select" label="Severity" value={filterSeverity}
          onChange={setFilterSeverity} options={SEVERITY_OPTIONS} />

        {/* Station filter — populated from API */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="station-select" style={{ fontSize: 13, color: "var(--text-muted)" }}>Station</label>
          <select id="station-select" value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
            className="input" style={{ padding: "6px 10px", fontSize: 13.5 }}>
            <option value="all">All Stations</option>
            {stations.map((s) => (
              <option key={s.stationId} value={s.stationId}>
                {s.stationId} ({s.name})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8,
          background: "var(--bg)", padding: "4px 12px", borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)" }}>
          <IconSearch size={14} color="var(--text-muted)" />
          <input type="text" placeholder="Search station, category…" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none",
              color: "var(--text)", fontSize: 14, width: 200 }} />
        </div>
      </div>

      {/* ── Main two-column layout ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Incident list */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)",
            background: "var(--surface)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              Incidents ({isLoading ? "…" : filtered.length})
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Click row to inspect</span>
          </div>

          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Channels</th>
                  <th>When</th>
                  <th>Verdict</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40,
                    color: "var(--text-muted)", fontSize: 14 }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40,
                    color: "var(--text-muted)", fontSize: 14 }}>No matching assessments.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.id} onClick={() => setSelected(a)}
                    style={{ cursor: "pointer",
                      background: selected?.id === a.id ? "var(--surface-hover)" : undefined }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--text)" }}>
                        {stationName(a.stationId)}
                      </div>
                      <div className="data-mono" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                        {a.stationId}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {a.affectedChannels?.length > 0
                        ? a.affectedChannels.join(", ")
                        : <span style={{ color: "var(--status-normal)" }}>none</span>}
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      <RelativeTime timestamp={a.observedAt} />
                    </td>
                    <td><StatusBadge verdict={a.verdict} /></td>
                    <td className="data-mono" style={{ fontSize: 13.5, fontWeight: 600,
                      color: (a.anomalyScore ?? 0) > 0.5 ? "var(--status-warning)" : "var(--text-muted)" }}>
                      {a.anomalyScore != null ? a.anomalyScore.toFixed(3) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
              <div>
                <span className="data-mono" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  {selected.id}
                </span>
                <h2 style={{ margin: "4px 0 0 0", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
                  {stationName(selected.stationId)} ({selected.stationId})
                </h2>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  <RelativeTime timestamp={selected.observedAt} /> · severity: <strong>{selected.severity}</strong>
                </div>
              </div>
              <StatusBadge verdict={selected.verdict} />
            </div>

            {/* Explanation */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                Diagnostic Explanation
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text)", margin: 0,
                background: "var(--bg)", padding: 14, borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)" }}>
                {selected.explanation}
              </p>
            </div>

            {/* Key metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <MetricBox label="Anomaly Score"
                value={selected.anomalyScore != null ? selected.anomalyScore.toFixed(3) : "—"}
                color="var(--accent)" />
              <MetricBox label="Severity"     value={selected.severity}  color="var(--text)" />
              <MetricBox label="Affected"
                value={selected.affectedChannels?.length > 0
                  ? selected.affectedChannels.join(", ") : "none"}
                color="var(--text)" />
              <MetricBox label="Category"
                value={selected.suspectedCategory?.replace(/_/g, " ") ?? "—"}
                color="var(--text)" />
            </div>

            {/* Evidence codes */}
            {selected.evidence?.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                  Evidence Flags
                </div>
                {selected.evidence.map((ev, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8,
                    marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                    <span className="badge badge-warning" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {ev.code}
                    </span>
                    <span>{ev.detail}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Correction proposals for this assessment */}
            {selectedCorrections.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>
                  Correction Proposals
                </div>
                {selectedCorrections.map((c) => {
                  const r = c.result ?? {};
                  const decision = reviewed[c.id] ?? c.review_state;
                  return (
                    <div key={c.id} style={{ background: "var(--bg)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5, textTransform: "capitalize" }}>
                          {c.channel} channel
                        </span>
                        <span className={`badge ${decision === "accepted" ? "badge-normal" :
                          decision === "rejected" ? "badge-critical" : "badge-warning"}`}
                          style={{ fontSize: 11 }}>
                          {decision?.replace(/_/g, " ") ?? "proposed"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--text)", marginBottom: 4 }}>
                        Raw: <strong className="data-mono" style={{ color: "var(--status-critical)" }}>
                          {r.rawValue != null ? r.rawValue.toFixed(2) : "—"}
                        </strong>
                        {r.estimate != null && (
                          <> · Estimate: <strong className="data-mono" style={{ color: "var(--accent)" }}>
                            {r.estimate.toFixed(2)}
                          </strong></>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}>
                        {r.reason}
                      </div>

                      {decision === "proposed" && r.estimate != null && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-primary"
                            style={{ flex: 1, justifyContent: "center", padding: "8px 12px", fontSize: 12 }}
                            onClick={() => handleReview(c.id, "accepted")}>
                            <IconCheck size={13} /><span>Accept</span>
                          </button>
                          <button className="btn"
                            style={{ flex: 1, justifyContent: "center", padding: "8px 12px", fontSize: 12 }}
                            onClick={() => handleReview(c.id, "rejected")}>
                            <IconClose size={13} /><span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, textAlign: "right" }}>
              <Link href={`/dashboard/stations/${selected.stationId}`}
                style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13.5,
                  display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span>Open Station Telemetry</span><IconArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 40, textAlign: "center",
            color: "var(--text-muted)", fontSize: 14 }}>
            Select an assessment row to view details.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label htmlFor={id} style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="input" style={{ padding: "6px 10px", fontSize: 13.5 }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function MetricBox({ label, value, color }) {
  return (
    <div style={{ background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border)" }}>
      <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{label}</div>
      <div className="data-mono" style={{ fontSize: 16, fontWeight: 700, color, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
