"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import StationMarker from "./StationMarker";

export default function MapPanel({ stations = [], selectedStationId, onSelectStation, height = "100%" }) {
  // Centre on the mean lat/lon of all stations, fallback to India centre
  const center = useMemo(() => {
    const valid = stations.filter(
      (s) => (s.latitude ?? s.lat) != null && (s.longitude ?? s.lon) != null
    );
    if (!valid.length) return [20.5937, 78.9629];
    const lat = valid.reduce((s, x) => s + (x.latitude ?? x.lat), 0) / valid.length;
    const lon = valid.reduce((s, x) => s + (x.longitude ?? x.lon), 0) / valid.length;
    return [lat, lon];
  }, [stations]);

  // Count by real verdict from normalised stations
  const counts = useMemo(() => {
    const c = { normal: 0, uncertain: 0, suspected_fault: 0, insufficient_data: 0 };
    stations.forEach((s) => {
      const v = s.verdict ?? "insufficient_data";
      if (v in c) c[v]++;
      else c.insufficient_data++;
    });
    return c;
  }, [stations]);

  return (
    <div style={{ height, width: "100%", borderRadius: "var(--radius)", overflow: "hidden",
      border: "1px solid var(--border)", position: "relative", background: "#0F151C" }}>
      <MapContainer center={center} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%", background: "#0B0F14" }}>
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />
        {stations.map((s) => (
          <StationMarker
            key={s.stationId}
            station={s}
            isSelected={s.stationId === selectedStationId}
            onClick={onSelectStation}
          />
        ))}
      </MapContainer>

      <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 1000,
        background: "rgba(19,27,36,0.92)", backdropFilter: "blur(4px)",
        padding: "6px 10px", borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)", fontSize: 11, display: "flex",
        gap: 12, color: "var(--text-secondary)" }}>
        <LegendDot color="#10B981" label={`Normal (${counts.normal})`} />
        <LegendDot color="#F59E0B" label={`Uncertain (${counts.uncertain})`} />
        <LegendDot color="#EF4444" label={`Fault (${counts.suspected_fault})`} />
        <LegendDot color="#64748B" label={`No data (${counts.insufficient_data})`} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span>{label}</span>
    </div>
  );
}
