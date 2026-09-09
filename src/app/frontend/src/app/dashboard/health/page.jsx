"use client";
"use client";
import { Battery, BatteryMedium, BatteryLow, Wifi, AlertCircle } from "lucide-react";

const mockSensors = [
  { id: "S-001", status: "Healthy", battery: 98, signal: "Strong", uptime: "99.9%" },
  { id: "S-002", status: "Healthy", battery: 85, signal: "Strong", uptime: "99.8%" },
  { id: "S-003", status: "Warning", battery: 45, signal: "Weak", uptime: "95.2%" },
  { id: "S-004", status: "Healthy", battery: 92, signal: "Strong", uptime: "99.9%" },
  { id: "S-005", status: "Critical", battery: 12, signal: "Lost", uptime: "88.4%" },
  { id: "S-006", status: "Healthy", battery: 78, signal: "Good", uptime: "99.5%" },
  { id: "S-007", status: "Healthy", battery: 88, signal: "Strong", uptime: "99.7%" },
  { id: "S-008", status: "Warning", battery: 52, signal: "Intermittent", uptime: "96.1%" },
];

export default function SensorHealth() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>Sensor Health</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
        {mockSensors.map((sensor) => (
          <SensorCard key={sensor.id} sensor={sensor} />
        ))}
      </div>
    </div>
  );
}

function SensorCard({ sensor }) {
  const isCritical = sensor.status === "Critical";
  const isWarning = sensor.status === "Warning";
  
  const color = isCritical ? "var(--orange)" : isWarning ? "var(--yellow)" : "var(--green)";
  
  return (
    <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 16 }}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{sensor.id}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Uptime: {sensor.uptime}</div>
          </div>
          <span className="badge" style={{ background: `rgba(${isCritical ? '248,113,113' : isWarning ? '251,191,36' : '52,211,153'}, 0.1)`, color }}>
             {sensor.status}
          </span>
       </div>

       <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}><Battery size={14} /> Battery</span>
                <span style={{ fontWeight: 600 }}>{sensor.battery}%</span>
             </div>
             <div style={{ width: "100%", height: 6, background: "var(--border-soft)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${sensor.battery}%`, height: "100%", background: color }} />
             </div>
          </div>
          <div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}><Wifi size={14} /> Signal</span>
                <span style={{ fontWeight: 600 }}>{sensor.signal}</span>
             </div>
          </div>
       </div>
    </div>
  );
}
