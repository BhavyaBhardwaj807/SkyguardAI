"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { mock24hHistory } from "../../../api/mockData";

const VERDICT_DISTRIBUTION = [
  { category: "Conforming Telemetry", count: 13565, pct: "94.2%", fill: "var(--status-normal)" },
  { category: "Hardware Sensor Faults", count: 490, pct: "3.4%", fill: "var(--status-critical)" },
  { category: "Sensor Drift (Hygrometer/Pressure)", count: 259, pct: "1.8%", fill: "var(--status-warning)" },
  { category: "Conforming Extreme Weather", count: 86, pct: "0.6%", fill: "var(--accent)" },
];

export default function HistoricalAnalysisPage() {
  const [selectedRange, setSelectedRange] = useState("30d");

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
            Historical Quality Analysis
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-muted)",
              margin: "6px 0 0 0",
              lineHeight: 1.5,
            }}
          >
            Long-term distribution of quality verdicts, sensor degradation rates, and diurnal cycles across the network.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label htmlFor="range-select" style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
            Time Window
          </label>
          <select
            id="range-select"
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="input"
            style={{ fontSize: "13.5px", padding: "6px 12px" }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days (Baseline Window)</option>
            <option value="90d">Full Replay Dataset</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "13.5px", color: "var(--text-muted)", fontWeight: 500 }}>
            Total Ingested Observations
          </div>
          <div className="data-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--text)", marginTop: "6px" }}>
            14,400
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
            6 AWS stations &middot; 30-day baseline window
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "13.5px", color: "var(--text-muted)", fontWeight: 500 }}>
            Clean Conformance Rate
          </div>
          <div className="data-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--status-normal)", marginTop: "6px" }}>
            94.2%
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
            13,565 observations conformed to physical limits
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "13.5px", color: "var(--text-muted)", fontWeight: 500 }}>
            Hardware Fault Rate
          </div>
          <div className="data-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--status-critical)", marginTop: "6px" }}>
            3.4%
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
            490 thermistor &amp; barometer spikes rejected
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "13.5px", color: "var(--text-muted)", fontWeight: 500 }}>
            Extreme Weather Confirmed
          </div>
          <div className="data-mono" style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent)", marginTop: "6px" }}>
            0.6%
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
            86 genuine regional storm events preserved
          </div>
        </div>
      </div>

      {/* Grid: Verdict Breakdown & Diurnal Cycles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* Quality Assessment Breakdown */}
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
            Quality Classification Breakdown
          </h3>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "0 0 16px 0" }}>
            Categorization across 14,400 observations over 30 days.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {VERDICT_DISTRIBUTION.map((v) => (
              <div key={v.category} style={{ fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>{v.category}</span>
                  <span className="data-mono" style={{ fontWeight: 600, color: "var(--text-muted)" }}>
                    {v.pct} ({v.count.toLocaleString()})
                  </span>
                </div>
                <div
                  style={{
                    height: "8px",
                    background: "var(--bg)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: v.pct,
                      background: v.fill,
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--text)" }}>Spatial Verification Rule:</strong> When extreme values occur simultaneously across &ge;3 stations with synchronized barometric pressure drops, the engine classifies the event as <em>conforming extreme weather</em> rather than a hardware fault.
          </div>
        </div>

        {/* Diurnal Temperature Trend Across Stations */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                Diurnal Cycle Consistency
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                Temperature profiles across AWS001 &ndash; AWS006.
              </p>
            </div>
            <div style={{ display: "flex", gap: "14px", fontSize: "13px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "3px", borderRadius: "2px", background: "var(--accent)" }} />
                <span style={{ color: "var(--text)" }}>Nominal Stations</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "3px", borderRadius: "2px", background: "var(--status-critical)" }} />
                <span style={{ color: "var(--status-critical)" }}>AWS005 Spike</span>
              </span>
            </div>
          </div>

          <div style={{ height: "260px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mock24hHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[15, 45]}
                  tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}°`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                />
                <Line type="monotone" dataKey="AWS001" name="AWS001" stroke="var(--text-muted)" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="AWS002" name="AWS002" stroke="var(--text-muted)" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="AWS004" name="AWS004" stroke="var(--text-muted)" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="AWS006" name="AWS006" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                <Line
                  type="monotone"
                  dataKey="AWS005"
                  name="AWS005 (Spike)"
                  stroke="var(--status-critical)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--status-critical)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "10px", lineHeight: 1.5 }}>
            Normal diurnal solar heating reaches its minimum around 04:00 UTC and peaks around 14:00 UTC. Notice how AWS005 abruptly deviates at 15:00 UTC without corroboration from adjacent stations.
          </div>
        </div>
      </div>
    </div>
  );
}
