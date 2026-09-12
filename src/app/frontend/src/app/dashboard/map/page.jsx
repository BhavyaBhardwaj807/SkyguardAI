"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import StatusBadge from "../../../components/StatusBadge";
import { IconArrowRight, IconRefresh, IconInfo } from "../../../components/Icons";
import { api } from "../../../api/client";

const MapPanel = dynamic(() => import("../../../components/MapPanel"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--surface)",
      color: "var(--text-muted)", fontSize: 14 }}>
      Loading map…
    </div>
  ),
});

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function LiveMapPage() {
  const [stations,        setStations]        = useState([]);
  const [selectedId,      setSelectedId]      = useState(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const run  = await api.getLatestRun();
      const data = await api.getStations(run?.id ?? null);
      setStations(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].stationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { load(); }, [load]);

  const selected = stations.find((s) => s.stationId === selectedId) ?? stations[0] ?? null;

  // Neighbour distances using real latitude/longitude from normalised shape
  const neighbours = useMemo(() => {
    if (!selected) return [];
    return stations
      .filter((s) => s.stationId !== selected.stationId)
      .map((s) => ({
        stationId: s.stationId,
        name:      s.name,
        distKm:    haversineKm(selected.latitude, selected.longitude, s.latitude, s.longitude),
        tempC:     s.temperatureC,
        verdict:   s.verdict,
      }))
      .sort((a, b) => a.distKm - b.distKm);
  }, [selected, stations]);

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
            Station Network Map
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "6px 0 0 0", lineHeight: 1.5 }}>
            Geographic distribution and spatial consensus neighbour distances.
          </p>
        </div>
        <button className="btn" onClick={load} disabled={isLoading}>
          <IconRefresh size={14} /><span>{isLoading ? "Loading…" : "Refresh"}</span>
        </button>
      </div>

      {/* ── Map + panel ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20,
        height: "calc(100vh - 220px)", minHeight: 560 }}>

        {/* Leaflet map */}
        <div style={{ height: "100%", width: "100%", position: "relative",
          borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)" }}>
          <MapPanel
            stations={stations}
            selectedStationId={selected?.stationId}
            onSelectStation={(s) => setSelectedId(s.stationId)}
          />
        </div>

        {/* Right panel */}
        <div style={{ height: "100%", overflowY: "auto", display: "flex",
          flexDirection: "column", gap: 16 }}>

          {/* Selected station card */}
          {selected && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <span className="data-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                    {selected.stationId}
                  </span>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: "2px 0 0 0" }}>
                    {selected.name}
                  </h3>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    {selected.latitude?.toFixed(4)}°N, {selected.longitude?.toFixed(4)}°E
                  </div>
                </div>
                <StatusBadge verdict={selected.verdict} />
              </div>

              {/* Readings */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
                background: "var(--bg)", padding: 12, borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)", marginTop: 12 }}>
                {[
                  { label: "Temperature", value: selected.temperatureC != null ? `${selected.temperatureC.toFixed(1)}°C` : "—",
                    alert: selected.assessment?.affectedChannels?.includes("temperature") },
                  { label: "Humidity",    value: selected.relativeHumidityPct != null ? `${selected.relativeHumidityPct.toFixed(0)}%` : "—",
                    alert: selected.assessment?.affectedChannels?.includes("humidity") },
                  { label: "Pressure",    value: selected.pressureHpa != null ? `${selected.pressureHpa.toFixed(0)} hPa` : "—",
                    alert: false },
                ].map(({ label, value, alert }) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
                    <div className="data-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 2,
                      color: alert ? "var(--status-critical)" : "var(--text)" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {selected.explanation && selected.verdict !== "normal" && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "10px 0 0 0",
                  lineHeight: 1.5 }}>
                  {selected.explanation}
                </p>
              )}

              <div style={{ marginTop: 16 }}>
                <Link href={`/dashboard/stations/${selected.stationId}`} className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}>
                  <span>Open Station Telemetry</span><IconArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {/* Neighbour distance table */}
          <div className="card" style={{ padding: 20, flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
              Nearest Stations
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px 0" }}>
              Distance used for spatial consensus validation.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {neighbours.map((n) => (
                <div key={n.stationId} onClick={() => setSelectedId(n.stationId)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)", fontSize: 13.5, cursor: "pointer" }}>
                  <div>
                    <span className="data-mono" style={{ fontWeight: 600, color: "var(--text)" }}>
                      {n.stationId}
                    </span>{" "}
                    <span style={{ color: "var(--text-muted)" }}>({n.name})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="data-mono" style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {n.distKm} km
                    </span>
                    <span className="data-mono" style={{ fontWeight: 600,
                      color: n.verdict === "suspected_fault" ? "var(--status-critical)" : "var(--text)" }}>
                      {n.tempC != null ? `${n.tempC.toFixed(1)}°C` : "—"}
                    </span>
                    <StatusBadge verdict={n.verdict} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", padding: 14, fontSize: 13,
              color: "var(--text-muted)", lineHeight: 1.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6,
                color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>
                <IconInfo size={14} color="var(--accent)" />
                <span>Spatial Consensus Rule</span>
              </div>
              Spatial verification requires at least 3 healthy stations within 100 km. Outside this radius,
              automated spatial interpolation is withheld.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
