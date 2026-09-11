"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "../../../components/StatusBadge";
import {
  IconRefresh,
  IconSearch,
} from "../../../components/Icons";
import { api } from "../../../api/client";

export default function StationsIndexPage() {
  const [stations, setStations] = useState([]);
  const [search, setSearch] = useState("");
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

  const filtered = stations.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const sId = (s.stationId || s.station_id || "").toLowerCase();
    const sName = (s.name || "").toLowerCase();
    return sId.includes(q) || sName.includes(q);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
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
            Weather Stations
          </h1>
          <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
            Real-time telemetry and operational status for all {stations.length} stations.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--surface)",
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            <IconSearch size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search stations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text)",
                fontSize: "13.5px",
                width: "160px",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            onClick={() => {
              setIsLoading(true);
              api.getStations().then((d) => {
                setStations(d || []);
                setIsLoading(false);
              });
            }}
            className="btn btn-ghost"
            disabled={isLoading}
            title="Refresh readings"
          >
            <IconRefresh size={14} />
          </button>
        </div>
      </div>

      {/* Scannable Station Comparison Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="table-container" style={{ border: "none" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Status</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Pressure</th>
                <th>Health Score</th>
                <th style={{ textAlign: "right" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((st) => {
                const sId = st.stationId || st.station_id;
                const r = st.reading || {};
                const temp = r.temperatureC ?? r.temperature ?? "—";
                const hum = r.relativeHumidityPct ?? r.humidity ?? "—";
                const pres = r.pressureHpa ?? r.pressure ?? "—";
                const health = st.healthScore ?? st.health_score ?? 90;

                return (
                  <tr key={sId}>
                    <td>
                      <Link
                        href={`/dashboard/stations/${sId}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "14.5px" }}>
                          {st.name}
                        </div>
                        <div className="data-mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {sId}
                        </div>
                      </Link>
                    </td>

                    <td>
                      <StatusBadge verdict={st.verdict || st.status} />
                    </td>

                    <td
                      className="data-mono"
                      style={{
                        fontSize: "14.5px",
                        fontWeight: sId === "AWS005" ? 700 : 400,
                        color: sId === "AWS005" ? "var(--status-critical)" : "var(--text)",
                      }}
                    >
                      {typeof temp === "number" ? temp.toFixed(1) + "°C" : temp}
                    </td>

                    <td
                      className="data-mono"
                      style={{
                        fontSize: "14.5px",
                        color: sId === "AWS003" ? "var(--status-warning)" : "var(--text)",
                      }}
                    >
                      {typeof hum === "number" ? hum.toFixed(0) + "%" : hum}
                    </td>

                    <td className="data-mono" style={{ fontSize: "14.5px" }}>
                      {typeof pres === "number" ? pres.toFixed(1) + " hPa" : pres}
                    </td>

                    <td>
                      <span
                        className="data-mono"
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 600,
                          color:
                            health < 50
                              ? "var(--status-critical)"
                              : health < 75
                              ? "var(--status-warning)"
                              : "var(--text)",
                        }}
                      >
                        {health}%
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/dashboard/stations/${sId}`}
                        style={{
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontSize: "13.5px",
                          fontWeight: 500,
                        }}
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
