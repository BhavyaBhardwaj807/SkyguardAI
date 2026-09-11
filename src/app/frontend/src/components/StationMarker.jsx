"use client";

import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

const STATUS_COLORS = {
  normal: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",
  offline: "#64748B",
};

function buildDivIcon(status, isSelected) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.offline;
  const ringSize = isSelected ? 18 : 12;
  const halo = isSelected ? `box-shadow: 0 0 0 4px ${color}33, 0 2px 8px rgba(0,0,0,0.6);` : `box-shadow: 0 0 0 2px rgba(11,15,20,0.9);`;

  const html = `
    <div style="
      width: ${ringSize}px;
      height: ${ringSize}px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid #FFFFFF;
      ${halo}
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    "></div>
  `;

  return L.divIcon({
    html,
    className: "custom-station-pin",
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
  });
}

export default function StationMarker({ station, isSelected, onClick }) {
  const status = station.status || "normal";
  const icon = buildDivIcon(status, isSelected);
  const r = station.reading || {};
  const sId = station.stationId || station.station_id;

  return (
    <Marker
      position={[station.lat, station.lon]}
      icon={icon}
      eventHandlers={{
        click: () => onClick && onClick(station),
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#0B0F14", padding: "2px" }}>
          <div style={{ fontWeight: 700, fontFamily: "monospace" }}>{sId} &ndash; {station.name}</div>
          <div style={{ marginTop: 3 }}>
            Temp: <strong>{r.temperatureC ?? r.temperature ?? "—"}°C</strong> &middot; Hum: <strong>{r.relativeHumidityPct ?? r.humidity ?? "—"}%</strong>
          </div>
          <div style={{ color: status === "critical" ? "#EF4444" : status === "warning" ? "#F59E0B" : "#10B981", fontWeight: 600, marginTop: 2 }}>
            Verdict: {status.toUpperCase()}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}
