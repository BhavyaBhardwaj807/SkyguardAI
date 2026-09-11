"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import StationMarker from "./StationMarker";

export default function MapPanel({
  stations = [],
  selectedStationId,
  onSelectStation,
  height = "100%",
}) {
  const center = [28.68, 77.35];

  return (
    <div
      style={{
        height,
        width: "100%",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        position: "relative",
        background: "#0F151C",
      }}
    >
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", background: "#0B0F14" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {stations.map((s) => {
          const sId = s.stationId || s.station_id;
          return (
            <StationMarker
              key={sId}
              station={s}
              isSelected={sId === selectedStationId}
              onClick={onSelectStation}
            />
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          zIndex: 1000,
          background: "rgba(19, 27, 36, 0.9)",
          backdropFilter: "blur(4px)",
          padding: "6px 10px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          fontSize: "11px",
          display: "flex",
          gap: "12px",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span className="status-dot normal" />
          <span>Nominal ({stations.filter((s) => (s.status || "normal") === "normal").length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span className="status-dot warning" />
          <span>Warning ({stations.filter((s) => s.status === "warning").length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span className="status-dot critical" />
          <span>Suspected Fault ({stations.filter((s) => s.status === "critical").length})</span>
        </div>
      </div>
    </div>
  );
}
