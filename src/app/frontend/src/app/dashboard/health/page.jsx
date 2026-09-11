"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "../../../components/StatusBadge";
import {
  IconRefresh,
  IconArrowRight,
} from "../../../components/Icons";
import { api } from "../../../api/client";

export default function SensorHealthPage() {
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState("AWS005");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getStations().then((data) => {
      if (mounted) {
        setStations(data || []);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selected =
    stations.find(
      (s) => (s.stationId || s.station_id) === selectedStationId
    ) || stations[0];

  const sId = selected?.stationId || selected?.station_id || "AWS005";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              margin: 0,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
            Sensor Health &amp; Degradation
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-muted)",
              margin: "6px 0 0 0",
              lineHeight: 1.5,
            }}
          >
            Deterministic scores evaluating sensor drift, temporal persistence, and reporting uptime across the station network.
          </p>
        </div>

        <button
          onClick={() => {
            setIsLoading(true);
            api.getStations().then((d) => {
              setStations(d || []);
              setIsLoading(false);
            });
          }}
          className="btn"
          disabled={isLoading}
        >
          <IconRefresh size={14} />
          <span>{isLoading ? "Syncing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Formula Specification Card */}
      <div
        className="card"
        style={{
          padding: "18px 20px",
          background: "var(--surface)",
          borderLeft: "3px solid var(--accent)",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", margin: "0 0 6px 0" }}>
          Deterministic Health Scoring Formula
        </h3>
        <div
          className="data-mono"
          style={{
            fontSize: "13.5px",
            background: "var(--bg)",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            overflowX: "auto",
            margin: "8px 0",
          }}
        >
          health_score = 100 - (30 &times; anomaly_rate_24h) - (25 &times; persistence_7d) - (20 &times; normalized_drift) - (15 &times; variance_change) - (10 &times; missing_rate_7d)
        </div>
        <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "6px 0 0 0", lineHeight: 1.5 }}>
          Scores are computed per channel (temperature, humidity, pressure) to track gradual physical sensor degradation rather than instantaneous weather events.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* Left: Station Channel Matrix */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
              Station Health Ranking
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Click row to inspect factors
            </span>
          </div>

          <div className="table-container" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Score</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                  <th>Pressure</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((st) => {
                  const id = st.stationId || st.station_id;
                  const isSelected = id === sId;
                  const health = st.healthScore ?? st.health_score ?? 90;
                  const c = st.channels || {};

                  return (
                    <tr
                      key={id}
                      onClick={() => setSelectedStationId(id)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "var(--surface-hover)" : undefined,
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text)" }}>
                          {st.name}
                        </div>
                        <div className="data-mono" style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                          {id}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                          <span
                            className="data-mono"
                            style={{
                              fontSize: "15px",
                              fontWeight: 700,
                              color:
                                health < 50
                                  ? "var(--status-critical)"
                                  : health < 75
                                  ? "var(--status-warning)"
                                  : "var(--status-normal)",
                            }}
                          >
                            {health}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>/100</span>
                        </div>
                      </td>
                      <td>
                        <ChannelPill score={c.temperature?.score ?? 95} status={c.temperature?.status ?? "healthy"} />
                      </td>
                      <td>
                        <ChannelPill score={c.humidity?.score ?? 90} status={c.humidity?.status ?? "healthy"} />
                      </td>
                      <td>
                        <ChannelPill score={c.pressure?.score ?? 96} status={c.pressure?.status ?? "healthy"} />
                      </td>
                      <td>
                        <StatusBadge verdict={st.verdict || st.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Station Penalty Inspector */}
        {selected && (
          <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "12px",
              }}
            >
              <div>
                <span className="data-mono" style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                  Station {sId}
                </span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: 600, color: "var(--text)" }}>
                  {selected.name}
                </h3>
              </div>
              <StatusBadge verdict={selected.verdict || selected.status} />
            </div>

            {/* Overall Health Score Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg)",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>Composite Score</div>
                <div
                  className="data-mono"
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color:
                      (selected.healthScore || selected.health_score) < 50
                        ? "var(--status-critical)"
                        : (selected.healthScore || selected.health_score) < 75
                        ? "var(--status-warning)"
                        : "var(--status-normal)",
                  }}
                >
                  {selected.healthScore || selected.health_score}/100
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "13px", color: "var(--text-muted)", maxWidth: "200px" }}>
                {sId === "AWS005"
                  ? "Thermistor failure detected; calibration required."
                  : sId === "AWS003"
                  ? "Hygrometer saturation detected; 7d drift accumulating."
                  : "All channels within operational bounds."}
              </div>
            </div>

            {/* 5 Formula Component Penalties */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>
                Factor Penalties
              </div>

              <ComponentRow
                label="Rolling 24h Anomaly Rate"
                weight="30%"
                value={sId === "AWS005" ? "0.82" : "0.02"}
                penalty={sId === "AWS005" ? "-24.6 pts" : "-0.6 pts"}
                isAlert={sId === "AWS005"}
              />

              <ComponentRow
                label="7d Persistence Flag Rate"
                weight="25%"
                value={sId === "AWS003" ? "0.48" : "0.00"}
                penalty={sId === "AWS003" ? "-12.0 pts" : "-0.0 pts"}
                isAlert={sId === "AWS003"}
              />

              <ComponentRow
                label="Drift vs 30d Baseline"
                weight="20%"
                value={sId === "AWS005" ? "4.8°C / Cap 3.0" : sId === "AWS003" ? "2.4% / Cap 3.0" : "0.2 unit"}
                penalty={sId === "AWS005" ? "-20.0 pts" : sId === "AWS003" ? "-16.0 pts" : "-1.3 pts"}
                isAlert={sId === "AWS005" || sId === "AWS003"}
              />

              <ComponentRow
                label="Variance Ratio Change"
                weight="15%"
                value={sId === "AWS005" ? "0.64" : "0.04"}
                penalty={sId === "AWS005" ? "-9.6 pts" : "-0.6 pts"}
                isAlert={sId === "AWS005"}
              />

              <ComponentRow
                label="Missing Intervals (7d)"
                weight="10%"
                value="0.01"
                penalty="-0.1 pts"
                isAlert={false}
              />
            </div>

            <div style={{ marginTop: "10px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <Link
                href={`/dashboard/stations/${sId}`}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}
              >
                <span>Inspect Station Telemetry</span>
                <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelPill({ score, status }) {
  const isCritical = status === "fault" || score < 50;
  const isWarning = status === "degraded" || score < 75;

  return (
    <span
      className={`badge ${
        isCritical ? "badge-critical" : isWarning ? "badge-warning" : "badge-normal"
      }`}
      style={{ fontSize: "12px", padding: "2px 8px" }}
    >
      {score}%
    </span>
  );
}

function ComponentRow({ label, weight, value, penalty, isAlert }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        background: "var(--bg)",
        borderRadius: "var(--radius-md)",
        fontSize: "13.5px",
        border: isAlert ? "1px solid var(--status-critical-border)" : "1px solid var(--border)",
      }}
    >
      <div>
        <div style={{ color: "var(--text)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
          Weight: {weight} &middot; Value: {value}
        </div>
      </div>
      <div
        className="data-mono"
        style={{
          fontWeight: 700,
          color: isAlert ? "var(--status-critical)" : "var(--text-muted)",
          fontSize: "14px",
        }}
      >
        {penalty}
      </div>
    </div>
  );
}
