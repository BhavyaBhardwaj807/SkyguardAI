"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../../theme/ThemeContext";
import { IconSun, IconMoon, IconCheck } from "../../../components/Icons";
import { api } from "../../../api/client";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  const [scenarios,    setScenarios]    = useState([]);
  const [run,          setRun]          = useState(null);
  const [scenario,     setScenario]     = useState("spike");
  const [replaySpeed,  setReplaySpeed]  = useState("1");
  const [isLoading,    setIsLoading]    = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [feedback,     setFeedback]     = useState(null); // { type: "ok"|"err", msg }

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scs, latestRun] = await Promise.all([
        api.getScenarios(),
        api.getLatestRun(),
      ]);
      setScenarios(scs);
      if (latestRun) {
        setRun(latestRun);
        setScenario(latestRun.scenario ?? "spike");
        setReplaySpeed(String(latestRun.speed ?? 1));
      }
    } catch (e) {
      setFeedback({ type: "err", msg: `Load failed: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Create a new run with the selected scenario
  const handleNewRun = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const newRun = await api.createRun(scenario);
      setRun(newRun);
      setFeedback({ type: "ok", msg: `New run created (${newRun.id.slice(0, 8)}…) — state: ${newRun.state}` });
    } catch (e) {
      setFeedback({ type: "err", msg: `Failed to create run: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Apply speed change to existing run
  const handleApplySpeed = async () => {
    if (!run?.id) return;
    setSaving(true);
    setFeedback(null);
    try {
      const action = run.state === "running" ? "start" : run.state === "paused" ? "resume" : "start";
      const updated = await api.controlRun(run.id, action, parseFloat(replaySpeed));
      setRun(updated);
      setFeedback({ type: "ok", msg: `Speed updated to ${replaySpeed}x — run is ${updated.state}.` });
    } catch (e) {
      setFeedback({ type: "err", msg: `Speed update failed: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 860 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.01em" }}>
            System Settings
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "6px 0 0 0", lineHeight: 1.5 }}>
            Replay orchestration and interface preferences.
          </p>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", fontSize: 13.5,
          background: feedback.type === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${feedback.type === "ok" ? "var(--status-normal)" : "var(--status-critical)"}`,
          color: feedback.type === "ok" ? "var(--status-normal)" : "var(--status-critical)" }}>
          {feedback.msg}
        </div>
      )}

      {/* ── Current run state ────────────────────────────────────────────── */}
      {run && (
        <div className="card" style={{ padding: "16px 20px", display: "flex",
          alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active Run</div>
            <div className="data-mono" style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 600 }}>
              {run.id.slice(0, 8)}…
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>State</div>
            <div className="data-mono" style={{ fontSize: 13.5, fontWeight: 600,
              color: run.state === "running" ? "var(--status-normal)" :
                     run.state === "paused"  ? "var(--status-warning)" : "var(--text-muted)" }}>
              {run.state}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Scenario</div>
            <div className="data-mono" style={{ fontSize: 13.5, color: "var(--accent)", fontWeight: 600 }}>
              {run.scenario}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Position</div>
            <div className="data-mono" style={{ fontSize: 13.5, color: "var(--text)" }}>
              {run.position}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Speed</div>
            <div className="data-mono" style={{ fontSize: 13.5, color: "var(--text)" }}>
              {run.speed}x
            </div>
          </div>
        </div>
      )}

      {/* ── Replay scenario control ──────────────────────────────────────── */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
          Replay Scenario
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 18px 0" }}>
          Create a new run with a selected scenario window. Available scenarios are loaded from the backend.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 16 }}>
          <div>
            <label htmlFor="scenario-select" style={{ display: "block", fontSize: 13.5, color: "var(--text)",
              fontWeight: 500, marginBottom: 6 }}>Scenario</label>
            <select id="scenario-select" value={scenario} onChange={(e) => setScenario(e.target.value)}
              className="input" style={{ width: "100%", fontSize: 14, padding: "8px 12px" }}
              disabled={isLoading}>
              {isLoading
                ? <option>Loading…</option>
                : scenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))
              }
            </select>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
              Feeds pre-recorded observations through the ingestion engine.
            </div>
          </div>

          <div>
            <label htmlFor="speed-select" style={{ display: "block", fontSize: 13.5, color: "var(--text)",
              fontWeight: 500, marginBottom: 6 }}>Replay Speed</label>
            <select id="speed-select" value={replaySpeed} onChange={(e) => setReplaySpeed(e.target.value)}
              className="input" style={{ width: "100%", fontSize: 14, padding: "8px 12px" }}>
              {[0.5, 1, 2, 5, 10, 20].map((v) => (
                <option key={v} value={String(v)}>{v}x{v === 1 ? " (real-time)" : ""}</option>
              ))}
            </select>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
              Interval pace between observation batches.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary" onClick={handleNewRun} disabled={saving || isLoading}
            style={{ padding: "10px 18px" }}>
            {saving ? "Creating…" : "Create New Run"}
          </button>
          {run && (
            <button className="btn" onClick={handleApplySpeed} disabled={saving}
              style={{ padding: "10px 18px" }}>
              {saving ? "Applying…" : "Apply Speed to Current Run"}
            </button>
          )}
        </div>
      </div>

      {/* ── Appearance ───────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
          Appearance
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px 0" }}>
          Toggle between dark and light themes.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={toggleTheme} className="btn" style={{ padding: "10px 18px" }}>
            {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
            <span>Switch to {theme === "dark" ? "Light" : "Dark"} Mode</span>
          </button>
          <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
            Current: <strong>{theme === "dark" ? "Dark" : "Light"}</strong>
          </span>
        </div>
      </div>

      {/* ── API info ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
          Backend Connection
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 14px 0" }}>
          All data is fetched live from the Express API proxied at <code>/api/v1</code>.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/healthz" target="_blank" rel="noreferrer" className="btn"
            style={{ fontSize: 13, padding: "8px 14px" }}>
            /healthz
          </a>
          <a href="/readyz" target="_blank" rel="noreferrer" className="btn"
            style={{ fontSize: 13, padding: "8px 14px" }}>
            /readyz
          </a>
          <a href="/api/v1/replay/scenarios" target="_blank" rel="noreferrer" className="btn"
            style={{ fontSize: 13, padding: "8px 14px" }}>
            /scenarios
          </a>
        </div>
      </div>
    </div>
  );
}
