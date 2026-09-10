"use client";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { AlertTriangle } from "lucide-react";

const COLORS = {
  normal: "#0f7b6c",
  warning: "#d9730d",
  critical: "#e03e3e",
  offline: "#9b9a97",
};

function buildIcon(status) {
  const color = COLORS[status] || COLORS.offline;
  const html =
    "<div style=\"width:10px;height:10px;border-radius:50%;background:" +
    color +
    ";border:2px solid #ffffff;box-shadow:0 0 0 1px " +
    color +
    "40;\"></div>";
  return L.divIcon({
    html,
    className: "map-marker-wrapper",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const ICONS = {
  normal: buildIcon("normal"),
  warning: buildIcon("warning"),
  critical: buildIcon("critical"),
  offline: buildIcon("offline"),
};

export default function StationMarker({ station }) {
  const icon = ICONS[station.status] || ICONS.offline;
  const r = station.reading;

  return (
    <Marker position={[station.lat, station.lon]} icon={icon}>
      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
        <div style={{ fontSize: 12, minWidth: 140 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{station.station_id}</div>
          {r && (
            <>
              <div>Temperature: {r.temperature}°C</div>
              <div>Humidity: {r.humidity}%</div>
              <div>Pressure: {r.pressure} hPa</div>
            </>
          )}
          {station.status !== "normal" && (
            <div style={{ marginTop: 4, color: station.status === "critical" ? "#e03e3e" : "#d9730d", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertTriangle size={12} />
              {station.status === "critical" ? "Critical anomaly" : "Warning"}
            </div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}
