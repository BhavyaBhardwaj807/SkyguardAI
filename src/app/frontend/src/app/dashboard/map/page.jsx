"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import StatusBadge from "../../../components/StatusBadge";
import {
  IconArrowRight,
  IconRefresh,
  IconInfo,
} from "../../../components/Icons";
import { api } from "../../../api/client";

// Dynamically import MapPanel to avoid SSR issues with Leaflet
const MapPanel = dynamic(() => import("../../../components/MapPanel"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface)",
        color: "var(--text-muted)",
        fontSize: "14px",
      }}
    >
      Loading interactive map...
    </div>
  ),
});

// Haversine distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function LiveMapPage() {
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
  const r = selected?.reading || {};
  const temp = r.temperatureC ?? r.temperature ?? "—";
  const hum = r.relativeHumidityPct ?? r.humidity ?? "—";
  const pres = r.pressureHpa ?? r.pressure ?? "—";

  // Compute neighbor distances
  const neighborDistances = selected
    ? stations
        .filter((s) => (s.stationId || s.station_id) !== sId)
        .map((s) => ({
          stationId: s.stationId || s.station_id,
          name: s.name,
          distanceKm: calculateDistanceKm(
            selected.lat,
            selected.lon,
            s.lat,
            s.lon
          ),
          temp: s.reading?.temperatureC ?? s.reading?.temperature ?? "—",
          status: s.status || "normal",
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

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
            Station Network Map
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-muted)",
              margin: "6px 0 0 0",
              lineHeight: 1.5,
            }}
          >
            Geographic distribution of monitoring stations and spatial consensus neighbor distances.
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

      {/* Main Map Viewport & Spatial Consensus Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: "20px",
          height: "calc(100vh - 220px)",
          minHeight: "560px",
        }}
      >
        {/* Left: Interactive Leaflet Map */}
        <div style={{ height: "100%", width: "100%", position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)" }}>
          <MapPanel
            stations={stations}
            selectedStationId={sId}
            onSelectStation={(st) => setSelectedStationId(st.stationId || st.station_id)}
          />
        </div>

        {/* Right: Selected Station Diagnostics & Spatial Neighbors */}
        <div
          style={{
            height: "100%",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Station Selected Card */}
          {selected && (
            <div className="card" style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <span
                    className="data-mono"
                    style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}
                  >
                    {sId}
                  </span>
                  <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", margin: "2px 0 0 0" }}>
                    {selected.name}
                  </h3>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {selected.lat?.toFixed(4)}°N, {selected.lon?.toFixed(4)}°E &middot; Elev {selected.elevationM ?? 210} m
                  </div>
                </div>
                <StatusBadge verdict={selected.verdict || selected.status} />
              </div>

              {/* Real-time Readings */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                  background: "var(--bg)",
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  marginTop: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Temperature</div>
                  <div
                    className="data-mono"
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: sId === "AWS005" ? "var(--status-critical)" : "var(--text)",
                      marginTop: "2px",
                    }}
                  >
                    {typeof temp === "number" ? temp.toFixed(1) + "°C" : temp}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Humidity</div>
                  <div
                    className="data-mono"
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: sId === "AWS003" ? "var(--status-warning)" : "var(--text)",
                      marginTop: "2px",
                    }}
                  >
                    {typeof hum === "number" ? hum.toFixed(0) + "%" : hum}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Pressure</div>
                  <div className="data-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", marginTop: "2px" }}>
                    {typeof pres === "number" ? pres.toFixed(0) + " hPa" : pres}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <Link
                  href={`/dashboard/stations/${sId}`}
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}
                >
                  <span>Open Full Station Telemetry</span>
                  <IconArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

          {/* Spatial Consensus & Distance Matrix */}
          <div className="card" style={{ padding: "20px", flex: 1 }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
              Nearest Neighbor Stations
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 14px 0" }}>
              Distance to adjacent nodes used for spatial consensus validation.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {neighborDistances.map((n) => (
                <div
                  key={n.stationId}
                  onClick={() => setSelectedStationId(n.stationId)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "13.5px",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <span className="data-mono" style={{ fontWeight: 600, color: "var(--text)" }}>
                      {n.stationId}
                    </span>{" "}
                    <span style={{ color: "var(--text-muted)" }}>({n.name})</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="data-mono" style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      {n.distanceKm} km
                    </span>
                    <span className="data-mono" style={{ fontWeight: 600, color: "var(--text)" }}>
                      {typeof n.temp === "number" ? n.temp.toFixed(1) + "°C" : n.temp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Spatial Consensus Rule Note */}
            <div
              style={{
                marginTop: "18px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
                fontSize: "13px",
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)", fontWeight: 600, marginBottom: "4px" }}>
                <IconInfo size={14} color="var(--accent)" />
                <span>Spatial Consensus Rule</span>
              </div>
              Spatial verification requires at least 3 healthy stations within 100 km. If neighboring nodes exceed this range or are marked faulty, automated spatial interpolation is withheld to ensure data accuracy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
