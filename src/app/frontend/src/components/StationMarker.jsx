"use client";

import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";

const STATUS_COLORS = {
  normal:             "#10B981",
  uncertain:          "#F59E0B",
  suspected_fault:    "#EF4444",
  insufficient_data:  "#64748B",
};

function colorForVerdict(verdict) {
  return STATUS_COLORS[verdict] ?? STATUS_COLORS.insufficient_data;
}

function buildDivIcon(verdict, isSelected) {
  const color = colorForVerdict(verdict);
  const size = isSelected ? 18 : 12;
  const shadow = isSelected
    ? `box-shadow:0 0 0 4px ${color}44,0 2px 8px rgba(0,0,0,0.6);`
    : `box-shadow:0 0 0 2px rgba(11,15,20,0.9);`;

  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #FFF;${shadow}transition:all .2s ease;"></div>`,
    className: "custom-station-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function StationMarker({ station, isSelected, onClick }) {
  // normaliseStation gives us latitude/longitude directly
  const lat = station.latitude ?? station.lat;
  const lon = station.longitude ?? station.lon;
  if (lat == null || lon == null) return null;

  const verdict = station.verdict ?? "insufficient_data";
  const icon = buildDivIcon(verdict, isSelected);

  return (
    <Marker
      position={[lat, lon]}
      icon={icon}
      eventHandlers={{ click: () => onClick?.(station) }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11.5, color: "#0B0F14", padding: "2px" }}>
          <div style={{ fontWeight: 700, fontFamily: "monospace" }}>
            {station.stationId} – {station.name}
          </div>
          <div style={{ marginTop: 3 }}>
            Temp: <strong>{station.temperatureC != null ? station.temperatureC.toFixed(1) + "°C" : "—"}</strong>
            {" · "}
            Hum: <strong>{station.relativeHumidityPct != null ? station.relativeHumidityPct.toFixed(0) + "%" : "—"}</strong>
          </div>
          <div style={{ color: colorForVerdict(verdict), fontWeight: 600, marginTop: 2 }}>
            {verdict.replace(/_/g, " ").toUpperCase()}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}
