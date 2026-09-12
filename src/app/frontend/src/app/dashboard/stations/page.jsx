"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "../../../components/StatusBadge";
import { IconRefresh, IconSearch } from "../../../components/Icons";
import { api } from "../../../api/client";

export default function StationsIndexPage() {
  const [stations, setStations] = useState([]);
  const [search,   setSearch]   = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]   = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const run = await api.getLatestRun();
      const data = await api.getStations(run?.id ?? null);
      setStations(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = stations.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.stationId.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });

  if (error) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--status-critical)", marginBottom: 12 }}>Failed to load: {error}</p>
        <button className="btn" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
            Weather Stations
          </h1>
          <p style={{ fontSize: 14.5, color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
            Real-time telemetry and operational status for all {stations.length} stations.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)",
            padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <IconSearch size={14} color="var(--text-muted)" />
            <input type="text" placeholder="Search stations…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none",
                color: "var(--text)", fontSize: 13.5, width: 160, fontFamily: "inherit" }} />
          </div>
          <button onClick={load} className="btn btn-ghost" disabled={isLoading} title="Refresh">
            <IconRefresh size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="table-container" style={{ border: "none" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Verdict</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Pressure</th>
                <th>Anomaly Score</th>
                <th style={{ textAlign: "right" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 40,
                    color: "var(--text-muted)", fontSize: 14 }}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 40,
                    color: "var(--text-muted)", fontSize: 14 }}>
                    No stations found.
                  </td>
                </tr>
              ) : filtered.map((st) => (
                <tr key={st.stationId}>
                  <td>
                    <Link href={`/dashboard/stations/${st.stationId}`}
                      style={{ textDecoration: "none", color: "inherit" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 14.5 }}>
                        {st.name}
                      </div>
                      <div className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {st.stationId}
                      </div>
                    </Link>
                  </td>
                  <td><StatusBadge verdict={st.verdict} /></td>
                  <td className="data-mono" style={{ fontSize: 14.5,
                    color: st.verdict === "suspected_fault" &&
                      st.assessment?.affectedChannels?.includes("temperature")
                      ? "var(--status-critical)" : "var(--text)" }}>
                    {st.temperatureC != null ? `${st.temperatureC.toFixed(1)}°C` : "—"}
                  </td>
                  <td className="data-mono" style={{ fontSize: 14.5,
                    color: st.verdict === "suspected_fault" &&
                      st.assessment?.affectedChannels?.includes("humidity")
                      ? "var(--status-critical)" : "var(--text)" }}>
                    {st.relativeHumidityPct != null ? `${st.relativeHumidityPct.toFixed(0)}%` : "—"}
                  </td>
                  <td className="data-mono" style={{ fontSize: 14.5 }}>
                    {st.pressureHpa != null ? `${st.pressureHpa.toFixed(1)} hPa` : "—"}
                  </td>
                  <td>
                    <span className="data-mono" style={{ fontSize: 13.5, fontWeight: 600,
                      color: (st.anomalyScore ?? 0) > 0.5 ? "var(--status-warning)" : "var(--text-muted)" }}>
                      {st.anomalyScore != null ? st.anomalyScore.toFixed(3) : "—"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/dashboard/stations/${st.stationId}`}
                      style={{ color: "var(--accent)", textDecoration: "none",
                        fontSize: 13.5, fontWeight: 500 }}>
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
