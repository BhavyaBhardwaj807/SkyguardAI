"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "../../components/StatusBadge";
import RelativeTime from "../../components/RelativeTime";
import { IconArrowRight, IconPause, IconPlay, IconStep, IconRefresh } from "../../components/Icons";
import { api } from "../../api/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { subscribeToEvents } from "../../sockets/socketClient";

export default function DashboardOverview() {
  const [stations, setStations]     = useState([]);
  const [faults, setFaults]         = useState([]);
  const [history, setHistory]       = useState([]);
  const [run, setRun]               = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);

  const load = useCallback(async () => {
    try {
      // 1. Get latest run first — everything else depends on it
      const latestRun = await api.getLatestRun();
      setRun(latestRun);
      const runId = latestRun?.id ?? null;

      // 2. Parallel fetch stations + non-normal assessments
      const [stData, faultData] = await Promise.all([
        api.getStations(runId),
        runId ? api.getAssessments(runId, "suspected_fault") : Promise.resolve([]),
      ]);
      setStations(stData);
      setFaults(faultData);

      // 3. History for the first station with a suspected fault, else first station
      const focusId = faultData[0]?.stationId ?? stData[0]?.stationId;
      if (focusId && runId) {
        const hist = await api.getStationHistory(focusId, runId);
        setHistory(hist);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Subscribe to SSE for live updates
  useEffect(() => {
    if (!run?.id) return;
    const unsub = subscribeToEvents(run.id, (evt) => {
      if (["run.updated", "assessment.created", "batch.processed"].includes(evt.type)) {
        load();
      }
    });
    return unsub;
  }, [run?.id, load]);

  const handleControl = async (action) => {
    if (!run?.id) return;
    try {
      const updated = await api.controlRun(run.id, action);
      setRun(updated);
    } catch (e) {
      setError(e.message);
    }
  };

  // Derived stats
  const faultCount    = stations.filter((s) => s.verdict === "suspected_fault").length;
  const uncertainCount = stations.filter((s) => s.verdict === "uncertain").length;
  const temps         = stations.map((s) => s.temperatureC).filter((v) => v != null);
  const regionalMean  = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null;

  // Primary incident = most recent suspected_fault assessment
  const incident = faults[0] ?? null;
  // Focus station for the chart
  const focusStationId = incident?.stationId ?? stations[0]?.stationId;

  if (isLoading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>
        Loading network status…
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
    <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 32 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
            Network Overview
          </h1>
          <p style={{ fontSize: 14.5, color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
            {stations.length} station{stations.length !== 1 ? "s" : ""} reporting
            {run ? ` · scenario: ${run.scenario}` : ""}.
          </p>
        </div>

        {/* Replay controls */}
        {run && (
          <div style={{ display: "flex", alignItems: "center", gap: 10,
            background: "var(--surface)", border: "1px solid var(--border)",
            padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>Scenario:</span>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{run.scenario}</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {run.state}
            </span>
            <span style={{ color: "var(--border)" }}>|</span>
            <button onClick={() => handleControl(run.state === "running" ? "pause" : "start")}
              className="btn btn-ghost" style={{ padding: "4px 8px", height: 26, fontSize: 12.5 }}>
              {run.state === "running" ? <IconPause size={12} /> : <IconPlay size={12} />}
              <span>{run.state === "running" ? "Pause" : "Resume"}</span>
            </button>
            <button onClick={() => handleControl("step")}
              disabled={run.state === "running"}
              className="btn btn-ghost" style={{ padding: "4px 8px", height: 26, fontSize: 12.5 }}
              title="Step one interval (requires paused run)">
              <IconStep size={12} /><span>Step</span>
            </button>
            <button onClick={load} className="btn btn-ghost"
              style={{ padding: "4px 8px", height: 26, fontSize: 12.5 }}>
              <IconRefresh size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Stations Reporting</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <span className="data-mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--text)" }}>
              {stations.length}
            </span>
            <span style={{ fontSize: 13, color: "var(--status-normal)" }}>online</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            {stations.map((s) => s.stationId).join(", ") || "—"}
          </p>
        </div>

        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Items Needing Attention</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <span className="data-mono" style={{ fontSize: 28, fontWeight: 700,
              color: faultCount > 0 ? "var(--status-critical)" : "var(--status-normal)" }}>
              {faultCount}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>suspected fault</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            {uncertainCount} uncertain · {stations.length - faultCount - uncertainCount} nominal
          </p>
        </div>

        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Regional Mean Temperature</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <span className="data-mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--text)" }}>
              {regionalMean != null ? `${regionalMean}°C` : "—"}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            Across {temps.length} reporting station{temps.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Active incident banner ──────────────────────────────────────── */}
      {incident && (
        <div className="card" style={{ padding: "20px 24px",
          borderLeft: "4px solid var(--status-critical)",
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="badge badge-critical">Attention Required</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <RelativeTime timestamp={incident.observedAt} />
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
              {incident.stationId} — {incident.suspectedCategory?.replace(/_/g, " ") ?? "suspected fault"}
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "4px 0 0 0", maxWidth: 780 }}>
              {incident.explanation}
            </p>
            {incident.affectedChannels?.length > 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                Affected channels: <strong>{incident.affectedChannels.join(", ")}</strong>
                {" · "}Anomaly score: <strong className="data-mono">{incident.anomalyScore?.toFixed(3)}</strong>
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href={`/dashboard/stations/${incident.stationId}`} className="btn btn-primary">
              <span>Inspect Station</span><IconArrowRight size={14} />
            </Link>
            <Link href="/dashboard/anomalies" className="btn">View Worklist</Link>
          </div>
        </div>
      )}

      {/* ── 48-hour temperature chart for focus station ─────────────────── */}
      {history.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>
                48-Hour Temperature — {focusStationId}
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                Live readings from the backend replay stream.
              </p>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <LegendLine color="var(--status-critical)" label="Suspected fault" />
              <LegendLine color="var(--accent)" label="Normal" />
            </div>
          </div>
          <div style={{ height: 260, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={{ stroke: "var(--border)" }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={{ stroke: "var(--border)" }} tickLine={false}
                  tickFormatter={(v) => `${v}°`} />
                <Tooltip contentStyle={{ background: "var(--surface-raised)",
                  border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--text)" }}
                  formatter={(v) => [`${v?.toFixed(1)}°C`, "Temperature"]} />
                <Line type="monotone" dataKey="temperatureC" name="Temperature"
                  stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                    const { payload, cx, cy } = props;
                    if (payload.verdict === "suspected_fault")
                      return <circle key={props.key} cx={cx} cy={cy} r={4} fill="var(--status-critical)" stroke="none" />;
                    return <circle key={props.key} cx={cx} cy={cy} r={2} fill="var(--accent)" stroke="none" />;
                  }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Station table ───────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Station Status</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
              Latest observation snapshot.
            </p>
          </div>
          <Link href="/dashboard/stations"
            style={{ fontSize: 13.5, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
            View all →
          </Link>
        </div>
        <div className="table-container" style={{ border: "none" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Station</th><th>Temperature</th><th>Humidity</th>
                <th>Pressure</th><th>Verdict</th><th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((st) => (
                <tr key={st.stationId}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text)" }}>{st.name}</div>
                    <div className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{st.stationId}</div>
                  </td>
                  <td className="data-mono" style={{ color: st.verdict === "suspected_fault" ? "var(--status-critical)" : "var(--text)" }}>
                    {st.temperatureC != null ? `${st.temperatureC.toFixed(1)}°C` : "—"}
                  </td>
                  <td className="data-mono">
                    {st.relativeHumidityPct != null ? `${st.relativeHumidityPct.toFixed(0)}%` : "—"}
                  </td>
                  <td className="data-mono">
                    {st.pressureHpa != null ? `${st.pressureHpa.toFixed(1)} hPa` : "—"}
                  </td>
                  <td><StatusBadge verdict={st.verdict} /></td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/dashboard/stations/${st.stationId}`}
                      style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LegendLine({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 2, background: color, display: "inline-block" }} />
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
    </span>
  );
}
