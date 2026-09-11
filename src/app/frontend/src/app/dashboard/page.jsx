"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "../../components/StatusBadge";
import {
  IconArrowRight,
  IconPause,
  IconPlay,
  IconStep,
} from "../../components/Icons";
import { api } from "../../api/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function DashboardOverview() {
  const [stations, setStations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [history, setHistory] = useState([]);
  const [replayState, setReplayState] = useState({ state: "running", scenario: "spike" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getStations(),
      api.getAssessments(),
      api.getStationHistory("AWS005"),
      api.getLatestRun(),
    ]).then(([sData, aData, hData, rData]) => {
      if (mounted) {
        setStations(sData || []);
        setAnomalies(aData || []);
        setHistory(hData || []);
        if (rData) setReplayState(rData);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleReplay = async () => {
    const nextAction = replayState.state === "running" ? "pause" : "start";
    setReplayState((prev) => ({ ...prev, state: nextAction === "start" ? "running" : "paused" }));
    await api.controlRun("current", nextAction);
  };

  const handleStepReplay = async () => {
    await api.controlRun("current", "step");
  };

  // Primary active incident requiring operator attention
  const activeIncident = anomalies.find((a) => a.severity === "critical") || anomalies[0];

  if (isLoading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>
        Loading network status and telemetry...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "32px" }}>
      {/* Header with Replay Context */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
            Network Overview
          </h1>
          <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
            {stations.length} automated stations reporting across the Northern India regional network.
          </p>
        </div>

        {/* Quiet Replay Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "4px 10px",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Scenario:</span>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>
            {replayState.scenario === "spike" ? "Temperature Spike" : replayState.scenario}
          </span>
          <span style={{ color: "var(--border)" }}>|</span>
          <button
            onClick={handleToggleReplay}
            className="btn btn-ghost"
            style={{ padding: "4px 8px", height: "26px", fontSize: "12.5px" }}
          >
            {replayState.state === "running" ? <IconPause size={12} /> : <IconPlay size={12} />}
            <span>{replayState.state === "running" ? "Pause" : "Resume"}</span>
          </button>
          <button
            onClick={handleStepReplay}
            disabled={replayState.state === "running"}
            className="btn btn-ghost"
            style={{ padding: "4px 8px", height: "26px", fontSize: "12.5px" }}
            title="Step one interval forward"
          >
            <IconStep size={12} />
            <span>Step</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Metrics - Spacious and Uncluttered */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
            Stations Reporting
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px" }}>
            <span className="data-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--text)" }}>
              {stations.length} of {stations.length}
            </span>
            <span style={{ fontSize: "13px", color: "var(--status-normal)" }}>online</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            AWS001 through AWS006 transmitting
          </p>
        </div>

        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
            Items Needing Attention
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px" }}>
            <span className="data-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--status-critical)" }}>
              {anomalies.filter((a) => a.severity === "critical").length}
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>suspected fault</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            AWS005 thermistor spike &middot; 1 drift warning
          </p>
        </div>

        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
            Regional Mean Temperature
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px" }}>
            <span className="data-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--text)" }}>
              25.8°C
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>expected ~25°C</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            Baseline diurnal variation within bounds
          </p>
        </div>
      </div>

      {/* Primary Actionable Incident Banner */}
      {activeIncident && (
        <div
          className="card"
          style={{
            padding: "20px 24px",
            borderLeft: "4px solid var(--status-critical)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="badge badge-critical">Attention Required</span>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>2 minutes ago</span>
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
              {activeIncident.stationName} ({activeIncident.stationId}) &mdash; Sudden +17.8°C spike reported
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "4px 0 0 0", maxWidth: "780px" }}>
              Reported reading reached 42.7°C while neighboring stations AWS001 and AWS002 confirm normal 24–26°C conditions without pressure drops. Isolated as localized thermistor failure.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link
              href={`/dashboard/stations/${activeIncident.stationId}`}
              className="btn btn-primary"
            >
              <span>Inspect Station Telemetry</span>
              <IconArrowRight size={14} />
            </Link>
            <Link
              href="/dashboard/anomalies"
              className="btn"
            >
              <span>View in Worklist</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Analytical View: 24-Hour Diurnal Temperature Profile */}
      <div className="card" style={{ padding: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text)" }}>
              24-Hour Diurnal Temperature Profile
            </h2>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
              Comparing AWS005 against regional neighbor consensus.
            </p>
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "2px", background: "var(--status-critical)" }} />
              <span style={{ color: "var(--text)" }}>AWS005 (Observed)</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "2px", background: "var(--accent)" }} />
              <span style={{ color: "var(--text-secondary)" }}>Regional Baseline</span>
            </span>
          </div>
        </div>

        <div style={{ height: "260px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                domain={[15, 45]}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                tickFormatter={(v) => `${v}°`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--text)",
                }}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                name="Regional Baseline"
                stroke="var(--accent)"
                strokeWidth={1.8}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="AWS005"
                name="AWS005 Observed"
                stroke="var(--status-critical)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "var(--status-critical)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clean Station Status Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
              Regional Stations Status
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
              Latest observation snapshot across all 6 monitoring nodes.
            </p>
          </div>
          <Link
            href="/dashboard/stations"
            style={{ fontSize: "13.5px", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
          >
            View station directory &rarr;
          </Link>
        </div>

        <div className="table-container" style={{ border: "none" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Pressure</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((st) => {
                const sId = st.stationId || st.station_id;
                const r = st.reading || {};
                const temp = r.temperatureC ?? r.temperature ?? "—";
                const hum = r.relativeHumidityPct ?? r.humidity ?? "—";
                const pres = r.pressureHpa ?? r.pressure ?? "—";

                return (
                  <tr key={sId}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{st.name}</div>
                      <div className="data-mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>{sId}</div>
                    </td>
                    <td
                      className="data-mono"
                      style={{
                        fontWeight: sId === "AWS005" ? 700 : 400,
                        color: sId === "AWS005" ? "var(--status-critical)" : "var(--text)",
                      }}
                    >
                      {typeof temp === "number" ? temp.toFixed(1) + "°C" : temp}
                    </td>
                    <td
                      className="data-mono"
                      style={{
                        color: sId === "AWS003" ? "var(--status-warning)" : "var(--text)",
                      }}
                    >
                      {typeof hum === "number" ? hum.toFixed(0) + "%" : hum}
                    </td>
                    <td className="data-mono">
                      {typeof pres === "number" ? pres.toFixed(1) + " hPa" : pres}
                    </td>
                    <td>
                      <StatusBadge verdict={st.verdict || st.status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/dashboard/stations/${sId}`}
                        style={{ color: "var(--accent)", textDecoration: "none", fontSize: "13px", fontWeight: 500 }}
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
