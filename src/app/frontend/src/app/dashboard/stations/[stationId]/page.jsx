"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "../../../../components/StatusBadge";
import RelativeTime from "../../../../components/RelativeTime";
import { api } from "../../../../api/client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function StationDetailPage({ params }) {
  const { stationId } = use(params);

  const [station,     setStation]     = useState(null);  // metadata from /stations/:id
  const [liveRow,     setLiveRow]     = useState(null);  // normalised row from /stations?runId=
  const [history,     setHistory]     = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [assessment,  setAssessment]  = useState(null);  // latest assessment for this station
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);
  const [runId,       setRunId]       = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Metadata (no runId needed)
      const meta = await api.getStationById(stationId);
      setStation(meta);

      // Latest run
      const run = await api.getLatestRun();
      const rid = run?.id ?? null;
      setRunId(rid);

      if (rid) {
        // All stations snapshot → find this one for live reading + assessment
        const allStations = await api.getStations(rid);
        const thisRow = allStations.find((s) => s.stationId === stationId) ?? null;
        setLiveRow(thisRow);
        setAssessment(thisRow?.assessment ?? null);

        // History + corrections in parallel
        const [hist, corrs] = await Promise.all([
          api.getStationHistory(stationId, rid),
          api.getCorrections(rid),
        ]);
        setHistory(hist);
        setCorrections(corrs.filter((c) => c.station_id === stationId));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>
        Loading telemetry for {stationId}…
      </div>
    );
  }

  if (error || !station) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--status-critical)", marginBottom: 12 }}>
          {error ?? "Station not found."}
        </p>
        <button className="btn" onClick={load}>Retry</button>
      </div>
    );
  }

  const temp  = liveRow?.temperatureC        ?? null;
  const hum   = liveRow?.relativeHumidityPct ?? null;
  const pres  = liveRow?.pressureHpa         ?? null;
  const verdict = liveRow?.verdict           ?? "insufficient_data";

  // Build description from real assessment data instead of hardcoded IDs
  const tempDesc = assessment?.affectedChannels?.includes("temperature")
    ? `${assessment.suspectedCategory?.replace(/_/g, " ") ?? "anomaly detected"}`
    : "Nominal reading";

  const humDesc = assessment?.affectedChannels?.includes("humidity")
    ? `${assessment.suspectedCategory?.replace(/_/g, " ") ?? "anomaly detected"}`
    : "Nominal reading";

  const presDesc = assessment?.affectedChannels?.includes("pressure")
    ? `${assessment.suspectedCategory?.replace(/_/g, " ") ?? "anomaly detected"}`
    : "Stable reading";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* ── Breadcrumb + header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13,
            color: "var(--text-muted)", marginBottom: 8 }}>
            <Link href="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/stations" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Stations</Link>
            <span>/</span>
            <span className="data-mono" style={{ color: "var(--accent)", fontWeight: 600 }}>{stationId}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.01em" }}>
              {station.name}
            </h1>
            <span className="data-mono" style={{ fontSize: 16, color: "var(--text-muted)" }}>({stationId})</span>
            <StatusBadge verdict={verdict} />
          </div>

          <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6 }}>
            {station.latitude?.toFixed(4)}°N · {station.longitude?.toFixed(4)}°E
            {liveRow?.observed_at && (
              <> · Last reading: <RelativeTime timestamp={liveRow.observed_at} /></>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={load}>Refresh</button>
          <Link href="/dashboard/anomalies" className="btn">Quality Incidents</Link>
          <Link href="/dashboard/map" className="btn">View on Map</Link>
        </div>
      </div>

      {/* ── Active assessment banner ────────────────────────────────────── */}
      {assessment && assessment.verdict !== "normal" && assessment.verdict !== "insufficient_data" && (
        <div className="card" style={{ padding: "16px 20px",
          borderLeft: `4px solid ${assessment.verdict === "suspected_fault" ? "var(--status-critical)" : "var(--status-warning)"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <StatusBadge verdict={assessment.verdict} />
            <span className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
              score: {assessment.anomalyScore?.toFixed(3) ?? "—"} · {assessment.severity} severity
            </span>
          </div>
          <p style={{ fontSize: 14, color: "var(--text)", margin: 0, lineHeight: 1.6 }}>
            {assessment.explanation}
          </p>
          {assessment.affectedChannels?.length > 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0 0" }}>
              Affected channels: <strong>{assessment.affectedChannels.join(", ")}</strong>
            </p>
          )}
        </div>
      )}

      {/* ── Reading cards ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <ReadingCard
          label="Ambient Temperature"
          value={temp != null ? `${temp.toFixed(1)}°C` : "—"}
          desc={tempDesc}
          alert={assessment?.affectedChannels?.includes("temperature")}
        />
        <ReadingCard
          label="Relative Humidity"
          value={hum != null ? `${hum.toFixed(0)}%` : "—"}
          desc={humDesc}
          alert={assessment?.affectedChannels?.includes("humidity")}
        />
        <ReadingCard
          label="Barometric Pressure"
          value={pres != null ? `${pres.toFixed(1)} hPa` : "—"}
          desc={presDesc}
          alert={assessment?.affectedChannels?.includes("pressure")}
        />
        <ReadingCard
          label="Anomaly Score"
          value={assessment?.anomalyScore != null ? assessment.anomalyScore.toFixed(3) : "—"}
          desc={assessment ? `verdict: ${assessment.verdict.replace(/_/g, " ")}` : "no assessment yet"}
          alert={assessment?.verdict === "suspected_fault"}
        />
      </div>

      {/* ── 48-hour temperature chart ────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>
              48-Hour Temperature Profile
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
              Live readings from replay stream · dots mark anomalous observations
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: 14 }}>
            No history available yet — start a run and wait for observations.
          </div>
        ) : (
          <div style={{ height: 260, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                  axisLine={{ stroke: "var(--border)" }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                  axisLine={{ stroke: "var(--border)" }} tickLine={false}
                  tickFormatter={(v) => `${v}°C`} />
                <Tooltip contentStyle={{ background: "var(--surface-raised)",
                  border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text)" }}
                  formatter={(v) => [v != null ? `${v.toFixed(1)}°C` : "—", "Temperature"]} />
                <Line type="monotone" dataKey="temperatureC" name="Temperature"
                  stroke="var(--accent)" strokeWidth={2} connectNulls
                  dot={(props) => {
                    const { payload, cx, cy } = props;
                    if (!cx || !cy) return null;
                    const isFault = payload.verdict === "suspected_fault";
                    const isUncertain = payload.verdict === "uncertain";
                    if (isFault)
                      return <circle key={props.key} cx={cx} cy={cy} r={5}
                        fill="var(--status-critical)" stroke="none" />;
                    if (isUncertain)
                      return <circle key={props.key} cx={cx} cy={cy} r={3}
                        fill="var(--status-warning)" stroke="none" />;
                    return <circle key={props.key} cx={cx} cy={cy} r={2}
                      fill="var(--accent)" stroke="none" />;
                  }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Evidence + corrections ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Assessment evidence */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 6px 0" }}>
            Assessment Evidence
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            Physical and statistical checks fired by the backend policy engine.
          </p>

          {!assessment ? (
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
              No assessment available yet.
            </div>
          ) : assessment.evidence?.length === 0 ? (
            <div style={{ fontSize: 14, color: "var(--status-normal)" }}>
              ✓ No evidence flags — all channels within bounds.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {assessment.evidence.map((ev, i) => (
                <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="badge badge-warning" style={{ fontSize: 11 }}>
                      {ev.code.replace(/_/g, " ")}
                    </span>
                    {ev.channel && (
                      <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                        {ev.channel}
                      </span>
                    )}
                    {ev.value != null && (
                      <span className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {ev.value.toFixed(2)} {ev.unit}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{ev.detail}</div>
                </div>
              ))}
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                Policy: <span className="data-mono">{assessment.policyVersion}</span>
                {" · "}Model: <span className="data-mono">{assessment.modelVersion ?? "—"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Correction proposals */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 6px 0" }}>
            Correction Proposals
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            Automated spatial estimates for operator review. Raw readings are never mutated.
          </p>

          {corrections.length === 0 ? (
            <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "10px 0" }}>
              No correction proposals for {stationId}.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {corrections.map((c) => {
                const r = c.result ?? {};
                const canReview = c.review_state === "proposed" && r.estimate != null;
                return (
                  <div key={c.id} style={{ background: "var(--bg)",
                    border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)",
                        textTransform: "capitalize" }}>
                        {c.channel} channel
                      </span>
                      <span className={`badge ${c.review_state === "accepted" ? "badge-normal" :
                        c.review_state === "rejected" ? "badge-critical" : "badge-warning"}`}
                        style={{ fontSize: 11 }}>
                        {c.review_state?.replace(/_/g, " ") ?? "proposed"}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 6 }}>
                      Raw: <strong className="data-mono" style={{ color: "var(--status-critical)" }}>
                        {r.rawValue != null ? r.rawValue.toFixed(2) : "—"}
                      </strong>
                      {r.estimate != null && (
                        <> → Estimate: <strong className="data-mono" style={{ color: "var(--accent)" }}>
                          {r.estimate.toFixed(2)}
                        </strong></>
                      )}
                    </div>

                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 6 }}>
                      Method: {r.method?.replace(/_/g, " ") ?? "—"}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{r.reason}</div>

                    {canReview && c.review_state === "proposed" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}
                          onClick={() => api.reviewCorrection(c.id, "accepted").then(load)}>
                          Accept estimate
                        </button>
                        <button className="btn" style={{ fontSize: 12, padding: "6px 12px" }}
                          onClick={() => api.reviewCorrection(c.id, "rejected").then(load)}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadingCard({ label, value, desc, alert }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 13.5, color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
      <div className="data-mono" style={{ fontSize: 28, fontWeight: 700, marginTop: 6,
        color: alert ? "var(--status-critical)" : "var(--text)" }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: alert ? "var(--status-warning)" : "var(--text-muted)", marginTop: 6 }}>
        {desc}
      </div>
    </div>
  );
}
