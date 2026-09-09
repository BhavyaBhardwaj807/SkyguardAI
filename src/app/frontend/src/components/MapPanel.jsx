"use client";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import StationMarker from "./StationMarker";

export default function MapPanel({ stations, height = 280, interactive = false, showCaption = true }) {
  const center = stations.length
    ? [
        stations.reduce((sum, s) => sum + s.lat, 0) / stations.length,
        stations.reduce((sum, s) => sum + s.lon, 0) / stations.length,
      ]
    : [28.6, 77.2];

  return (
    <div>
      <div style={{ height, borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
        <MapContainer
          center={center}
          zoom={9}
          zoomControl={interactive}
          dragging={interactive}
          scrollWheelZoom={interactive}
          doubleClickZoom={interactive}
          style={{ height: "100%", width: "100%", background: "var(--bg)" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stations.map((s) => (
            <StationMarker key={s.station_id} station={s} />
          ))}
        </MapContainer>
      </div>
      {showCaption && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: "var(--space-2)",
          }}
        >
          <span>{stations.length} stations &middot; live network</span>
          <span style={{ display: "flex", gap: 10 }}>
            <LegendDot color="var(--status-normal)" label="Healthy" />
            <LegendDot color="var(--status-warning)" label="Warning" />
            <LegendDot color="var(--status-critical)" label="Critical" />
          </span>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
