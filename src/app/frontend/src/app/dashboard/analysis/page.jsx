"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { api } from "../../../api/client";
import { IconRefresh } from "../../../components/Icons";

const VERDICT_COLORS = {
  normal:            "var(--status-normal)",
  suspected_fault:   "var(--status-critical)",
  uncertain:         "var(--status-warning)",
  insufficient_data: "var(--text-muted)",
};

const STROKE_COLORS = [
  "#38bdf8","#a78bfa","#34d399","#fb923c","#f472b6","#facc15","#60a5fa","#4ade80",
];

export default function HistoricalAnalysisPage() {
  const [stations, setStations]       = useState([]);
  const [allAssessments, setAll]      = useState([]);
  const [chartData, setChartData]     = useState([]);   // [{time, [stationId]: tempC, …}]
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [runInfo, setRunInfo]         = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const run = await api.getLatestRun();
      setRunInfo(run);
      const runId = run?.id ?? null;

      const [stData, aData] = await Promise.all([
        api.getStations(runId),
        runId ? api.getAssessments(runId) : Promise.resolve([]),
      ]);
      setStations(stData);
      setAll(aData);

      // Build multi-station history chart from all stations in parallel
      if (runId && stData.length > 0) {
        const histories = await Promise.all(
          stData.map((s) => api.getStationHistory(s.stationId, runId).catch(() => []))
        );

        // Merge by time label into [{time, AWS001: t, AWS002: t, …, verdict_AWS001: v, …}]
        const byTime = new Map();
        stData.forEach((st, idx) => {
          histories[idx].forEach((row) => {
            if (!byTime.has(row.time)) byTime.set(row.time, { time: row.time, observed_at: row.observed_at });
            const entry = byTime.get(row.time);
            entry[st.stationId] = row.temperatureC;
            entry[`verdict_${st.stationId}`] = row.verdict;
          });
        });

        // Sort chronologically
        const sorted = [...byTime.values()].sort(
          (a, b) => new Date(a.observed_at) - new Date(b.observed_at)
        );
        setChartData(sorted);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute verdict distribution from real assessments
  const verdictCounts = allAssessments.reduce((acc, a) => {
    acc[a.verdict] = (acc[a.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const total = allAssessments.length || 1; // avoid /0

  const distribution = [
    { label: "Normal",           verdict: "normal",            color: "var(--status-normal)" },
    { label: "Suspected Fault",  verdict: "suspected_fault",   color: "var(--status-critical)" },
    { label: "Uncertain",        verdict: "uncertain",         color: "var(--status-warning)" },
    { label: "Insufficient Data",verdict: "insufficient_data", color: "var(--text-muted)" },
  ].map((d) => ({
    ...d,
    count: verdictCounts[d.verdict] ?? 0,
    pct:   (((verdictCounts[d.verdict] ?? 0) / total) * 100).toFixed(1) + "%",
  }));

  const faultRate    = (((verdictCounts.suspected_fault ?? 0) / total) * 100).toFixed(1);
  const normalRate   = (((verdictCounts.normal          ?? 0) / total) * 100).toFixed(1);
  const uncertainRate= (((verdictCounts.uncertain       ?? 0) / total) * 100).toFixed(1);

  if (isLoading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>
        Loading historical analysis…
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.01em" }}>
            Historical Quality Analysis
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "6px 0 0 0", lineHeight: 1.5 }}>
            Verdict distribution and temperature profiles across the station network
            {runInfo ? ` · run ${runInfo.scenario}` : ""}.
          </p>
        </div>
        <button className="btn" onClick={load} disabled={isLoading}>
          <IconRefresh size={14} /><span>Refresh</span>
        </button>
      </div>

      {/* ── Summary metrics ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {[
          { label: "Total Assessments",   value: allAssessments.length.toLocaleString(), color: "var(--text)" },
          { label: "Normal Rate",         value: `${normalRate}%`,    color: "var(--status-normal)" },
          { label: "Fault Rate",          value: `${faultRate}%`,     color: "var(--status-critical)" },
          { label: "Uncertain Rate",      value: `${uncertainRate}%`, color: "var(--status-warning)" },
        ].map((c) => (
          <div key={c.label} className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", fontWeight: 500 }}>{c.label}</div>
            <div className="data-mono" style={{ fontSize: 28, fontWeight: 700, color: c.color, marginTop: 6 }}>
              {c.value}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
              {allAssessments.length} total observations
            </div>
          </div>
        ))}
      </div>

      {/* ── Verdict breakdown + diurnal chart ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20, alignItems: "start" }}>

        {/* Verdict distribution bars */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
            Verdict Distribution
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 16px 0" }}>
            Across {allAssessments.length.toLocaleString()} assessments in current run window.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {distribution.map((v) => (
              <div key={v.verdict} style={{ fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>{v.label}</span>
                  <span className="data-mono" style={{ fontWeight: 600, color: "var(--text-muted)" }}>
                    {v.pct} ({v.count.toLocaleString()})
                  </span>
                </div>
                <div style={{ height: 8, background: "var(--bg)", borderRadius: 4,
                  overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{ height: "100%", width: v.pct, background: v.color, borderRadius: 4,
                    minWidth: v.count > 0 ? 4 : 0 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 14, background: "var(--bg)",
            border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
            fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--text)" }}>Spatial verification:</strong> When extreme values
            occur simultaneously across ≥3 stations with synchronised pressure drops, the engine classifies
            the event as a genuine regional weather event rather than a hardware fault.
          </div>
        </div>

        {/* Multi-station temperature chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                Temperature Profiles — All Stations
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                48-hour window from replay stream.
              </p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", fontSize: 14 }}>
              No history data available yet — start a run and wait for observations.
            </div>
          ) : (
            <div style={{ height: 260, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={{ stroke: "var(--border)" }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={{ stroke: "var(--border)" }} tickLine={false}
                    tickFormatter={(v) => `${v}°`} />
                  <Tooltip contentStyle={{ background: "var(--surface-raised)",
                    border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--text)" }}
                    formatter={(v, name) => [v != null ? `${v.toFixed(1)}°C` : "—", name]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
                  {stations.map((st, i) => (
                    <Line key={st.stationId} type="monotone" dataKey={st.stationId}
                      name={`${st.stationId} (${st.name})`}
                      stroke={STROKE_COLORS[i % STROKE_COLORS.length]}
                      strokeWidth={1.5} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Per-station assessment summary table ────────────────────────── */}
      {stations.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)",
            background: "var(--surface)" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              Per-Station Assessment Breakdown
            </span>
          </div>
          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Total</th>
                  <th>Normal</th>
                  <th>Suspected Fault</th>
                  <th>Uncertain</th>
                  <th>Insuff. Data</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((st) => {
                  const byStation = allAssessments.filter((a) => a.stationId === st.stationId);
                  const counts = byStation.reduce((acc, a) => {
                    acc[a.verdict] = (acc[a.verdict] ?? 0) + 1;
                    return acc;
                  }, {});
                  return (
                    <tr key={st.stationId}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{st.name}</div>
                        <div className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{st.stationId}</div>
                      </td>
                      <td className="data-mono">{byStation.length}</td>
                      <td className="data-mono" style={{ color: "var(--status-normal)" }}>
                        {counts.normal ?? 0}
                      </td>
                      <td className="data-mono" style={{ color: (counts.suspected_fault ?? 0) > 0 ? "var(--status-critical)" : "var(--text-muted)" }}>
                        {counts.suspected_fault ?? 0}
                      </td>
                      <td className="data-mono" style={{ color: (counts.uncertain ?? 0) > 0 ? "var(--status-warning)" : "var(--text-muted)" }}>
                        {counts.uncertain ?? 0}
                      </td>
                      <td className="data-mono" style={{ color: "var(--text-muted)" }}>
                        {counts.insufficient_data ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
