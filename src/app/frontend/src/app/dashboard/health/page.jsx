"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "../../../components/StatusBadge";
import { IconRefresh, IconArrowRight } from "../../../components/Icons";
import { api } from "../../../api/client";

// Colour by coverage ratio (0-1)
function coverageColor(ratio) {
  if (ratio == null) return "var(--text-muted)";
  if (ratio >= 0.8) return "var(--status-normal)";
  if (ratio >= 0.4) return "var(--status-warning)";
  return "var(--status-critical)";
}

function ChannelPill({ status, score }) {
  const color =
    status === "insufficient_data" ? "var(--text-muted)" :
    score == null                   ? "var(--text-muted)" :
    score >= 70                     ? "var(--status-normal)" :
    score >= 40                     ? "var(--status-warning)" :
                                      "var(--status-critical)";
  const label = score != null ? `${score.toFixed(0)}` : status?.replace(/_/g, " ") ?? "—";
  return (
    <span className="badge" style={{ fontSize: 12, padding: "2px 8px",
      background: color + "22", color }}>
      {label}
    </span>
  );
}

export default function SensorHealthPage() {
  const [stations, setStations]         = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [healthMap, setHealthMap]       = useState({});   // stationId → health response
  const [runId, setRunId]               = useState(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [error, setError]               = useState(null);

  const loadStations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const run = await api.getLatestRun();
      const rid = run?.id ?? null;
      setRunId(rid);
      const stData = await api.getStations(rid);
      setStations(stData);
      if (stData.length > 0 && !selectedId) setSelectedId(stData[0].stationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { loadStations(); }, [loadStations]);

  // Load health for selected station whenever it changes
  useEffect(() => {
    if (!selectedId || !runId) return;
    if (healthMap[selectedId]) return; // already fetched

    setLoadingHealth(true);
    api.getStationHealth(selectedId, runId)
      .then((h) => setHealthMap((prev) => ({ ...prev, [selectedId]: h })))
      .catch(() => {}) // silently ignore; shows "—"
      .finally(() => setLoadingHealth(false));
  }, [selectedId, runId, healthMap]);

  const selected    = stations.find((s) => s.stationId === selectedId);
  const health      = healthMap[selectedId] ?? null;
  const channels    = health?.channels ?? [];

  if (isLoading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>
        Loading sensor health…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--status-critical)", marginBottom: 12 }}>Failed to load: {error}</p>
        <button className="btn" onClick={loadStations}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.01em" }}>
            Sensor Health &amp; Channel Coverage
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "6px 0 0 0", lineHeight: 1.5 }}>
            Per-channel coverage indicators from the backend health endpoint. Select a station to inspect.
          </p>
        </div>
        <button className="btn" onClick={() => { setHealthMap({}); loadStations(); }} disabled={isLoading}>
          <IconRefresh size={14} /><span>Refresh</span>
        </button>
      </div>

      {/* ── Formula card ─────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "18px 20px", background: "var(--surface)",
        borderLeft: "3px solid var(--accent)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: "0 0 6px 0" }}>
          Health Scoring — handoff-health-v1
        </h3>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          Scores are computed per channel (temperature, humidity, pressure) from coverage ratios:
          baseline window coverage, observation density and assessment density.
          <strong style={{ color: "var(--text)" }}> Insufficient data</strong> is shown when less than
          30 days of history are available — this is normal in early replay windows.
        </p>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Station ranking table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)",
            background: "var(--surface)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Station List</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Click to inspect</span>
          </div>
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Verdict</th>
                  <th>Temp °C</th>
                  <th>Hum %</th>
                  <th>Pres hPa</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((st) => {
                  const isSelected = st.stationId === selectedId;
                  return (
                    <tr key={st.stationId}
                      onClick={() => setSelectedId(st.stationId)}
                      style={{ cursor: "pointer",
                        background: isSelected ? "var(--surface-hover)" : undefined }}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{st.name}</div>
                        <div className="data-mono" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{st.stationId}</div>
                      </td>
                      <td><StatusBadge verdict={st.verdict} /></td>
                      <td className="data-mono">
                        {st.temperatureC != null ? st.temperatureC.toFixed(1) : "—"}
                      </td>
                      <td className="data-mono">
                        {st.relativeHumidityPct != null ? st.relativeHumidityPct.toFixed(0) : "—"}
                      </td>
                      <td className="data-mono">
                        {st.pressureHpa != null ? st.pressureHpa.toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected station channel detail */}
        {selected && (
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div>
                <span className="data-mono" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  {selected.stationId}
                </span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
                  {selected.name}
                </h3>
                {health?.asOf && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    As of {new Date(health.asOf).toLocaleString()}
                  </div>
                )}
              </div>
              <StatusBadge verdict={selected.verdict} />
            </div>

            {/* Current readings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Temperature", value: selected.temperatureC != null ? `${selected.temperatureC.toFixed(1)}°C` : "—" },
                { label: "Humidity",    value: selected.relativeHumidityPct != null ? `${selected.relativeHumidityPct.toFixed(0)}%` : "—" },
                { label: "Pressure",    value: selected.pressureHpa != null ? `${selected.pressureHpa.toFixed(1)} hPa` : "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--bg)", padding: "10px 12px",
                  borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
                  <div className="data-mono" style={{ fontSize: 16, fontWeight: 700,
                    color: "var(--text)", marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Channel health from /stations/:id/health */}
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>
              Channel Coverage Indicators
            </div>

            {loadingHealth ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>
                Loading channel data…
              </div>
            ) : channels.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>
                No channel data available. Run must be active with processed observations.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {channels.map((ch) => (
                  <div key={ch.channel} style={{ padding: "10px 12px", background: "var(--bg)",
                    borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)", textTransform: "capitalize", fontSize: 14 }}>
                        {ch.channel}
                      </div>
                      <ChannelPill status={ch.status} score={ch.score} />
                    </div>

                    {ch.coverage && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5 }}>
                        {[
                          { label: "Baseline window",  ratio: ch.coverage.baseline },
                          { label: "Observations",      ratio: ch.coverage.observations },
                          { label: "Assessments",       ratio: ch.coverage.assessments },
                        ].map(({ label, ratio }) => (
                          <div key={label}>
                            <div style={{ display: "flex", justifyContent: "space-between",
                              color: "var(--text-muted)", marginBottom: 2 }}>
                              <span>{label}</span>
                              <span className="data-mono" style={{ color: coverageColor(ratio) }}>
                                {ratio != null ? (ratio * 100).toFixed(0) + "%" : "—"}
                              </span>
                            </div>
                            <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
                              <div style={{ height: "100%",
                                width: `${Math.min((ratio ?? 0) * 100, 100)}%`,
                                background: coverageColor(ratio), borderRadius: 2 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {ch.status === "insufficient_data" && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                        Score unavailable — insufficient baseline coverage.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <Link href={`/dashboard/stations/${selected.stationId}`}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}>
                <span>Open Station Telemetry</span>
                <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
