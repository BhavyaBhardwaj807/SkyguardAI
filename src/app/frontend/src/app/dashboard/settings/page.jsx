"use client";

import { useState } from "react";
import { useTheme } from "../../../theme/ThemeContext";
import {
  IconSun,
  IconMoon,
  IconCheck,
} from "../../../components/Icons";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  // Replay settings
  const [scenario, setScenario] = useState("spike");
  const [replaySpeed, setReplaySpeed] = useState("1.0");

  // QC thresholds
  const [anomalyThreshold, setAnomalyThreshold] = useState("0.65");
  const [confidenceThreshold, setConfidenceThreshold] = useState("0.70");
  const [spatialRadiusKm, setSpatialRadiusKm] = useState("100");

  // Feedback state
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: "860px" }}>
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
            System Settings
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-muted)",
              margin: "6px 0 0 0",
              lineHeight: 1.5,
            }}
          >
            Configure quality control thresholds, replay scenarios, and interface preferences.
          </p>
        </div>

        <div>
          <button onClick={handleSave} className="btn btn-primary" style={{ padding: "10px 18px" }}>
            {saved ? <IconCheck size={15} /> : null}
            <span>{saved ? "Saved" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Replay Scenario Orchestration */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
          Replay Scenario Control
        </h3>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 18px 0" }}>
          Select the meteorological observation stream fed through the ingestion engine.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
          <div>
            <label htmlFor="scenario-select" style={{ display: "block", fontSize: "13.5px", color: "var(--text)", fontWeight: 500, marginBottom: "6px" }}>
              Active Scenario
            </label>
            <select
              id="scenario-select"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="input"
              style={{ width: "100%", fontSize: "14px", padding: "8px 12px" }}
            >
              <option value="spike">Temperature spike fault (AWS005)</option>
              <option value="drift">Capacitive hygrometer drift (AWS003)</option>
              <option value="gap">Intermittent packet loss</option>
              <option value="extreme_weather">Convective squall with isobar drop</option>
            </select>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
              Feeds pre-recorded test observations for audit validation.
            </div>
          </div>

          <div>
            <label htmlFor="speed-select" style={{ display: "block", fontSize: "13.5px", color: "var(--text)", fontWeight: 500, marginBottom: "6px" }}>
              Replay Speed
            </label>
            <select
              id="speed-select"
              value={replaySpeed}
              onChange={(e) => setReplaySpeed(e.target.value)}
              className="input"
              style={{ width: "100%", fontSize: "14px", padding: "8px 12px" }}
            >
              <option value="0.5">0.5x (Slow motion)</option>
              <option value="1.0">1.0x (Real-time)</option>
              <option value="2.0">2.0x (Double speed)</option>
              <option value="5.0">5.0x (Rapid test)</option>
            </select>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
              Interval pace between observation updates.
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Quality Control Thresholds */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
          Quality Control Thresholds
        </h3>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 18px 0" }}>
          Parameters governing automated anomaly detection and spatial self-healing proposals.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div>
            <label htmlFor="anomaly-thresh" style={{ display: "block", fontSize: "13.5px", color: "var(--text)", fontWeight: 500, marginBottom: "6px" }}>
              Anomaly Score Cutoff
            </label>
            <input
              id="anomaly-thresh"
              type="number"
              step="0.05"
              min="0.4"
              max="0.95"
              value={anomalyThreshold}
              onChange={(e) => setAnomalyThreshold(e.target.value)}
              className="input data-mono"
              style={{ width: "100%", fontSize: "14px", padding: "8px 12px" }}
            />
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "6px" }}>
              Threshold above which observations are flagged for review.
            </div>
          </div>

          <div>
            <label htmlFor="confidence-thresh" style={{ display: "block", fontSize: "13.5px", color: "var(--text)", fontWeight: 500, marginBottom: "6px" }}>
              Min Substitute Confidence
            </label>
            <input
              id="confidence-thresh"
              type="number"
              step="0.05"
              min="0.5"
              max="0.95"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              className="input data-mono"
              style={{ width: "100%", fontSize: "14px", padding: "8px 12px" }}
            />
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "6px" }}>
              Minimum confidence to generate a substitute proposal.
            </div>
          </div>

          <div>
            <label htmlFor="spatial-radius" style={{ display: "block", fontSize: "13.5px", color: "var(--text)", fontWeight: 500, marginBottom: "6px" }}>
              Spatial Radius (km)
            </label>
            <input
              id="spatial-radius"
              type="number"
              step="10"
              min="50"
              max="250"
              value={spatialRadiusKm}
              onChange={(e) => setSpatialRadiusKm(e.target.value)}
              className="input data-mono"
              style={{ width: "100%", fontSize: "14px", padding: "8px 12px" }}
            />
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "6px" }}>
              Maximum neighbor distance for spatial interpolation.
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Interface Theme */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
          Appearance
        </h3>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 16px 0" }}>
          Toggle between dark charcoal theme and light mode.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={toggleTheme}
            className="btn"
            style={{ padding: "10px 18px" }}
          >
            {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
            <span>Switch to {theme === "dark" ? "Light" : "Dark"} Mode</span>
          </button>
          <span style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
            Current theme: <strong>{theme === "dark" ? "Dark Charcoal (#181d21)" : "Light Neutral"}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
