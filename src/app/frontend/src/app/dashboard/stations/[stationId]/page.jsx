"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Battery, Thermometer, Wind } from "lucide-react";

const temperatureData = [
  { time: "00:00", temp: 22 }, { time: "04:00", temp: 21 },
  { time: "08:00", temp: 24 }, { time: "12:00", temp: 28 },
  { time: "16:00", temp: 27 }, { time: "20:00", temp: 23 },
];

export default function StationDetail() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>Station AWS_001</h1>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Location: Sector 4 North • Status: Online</div>
        </div>
        <div className="badge badge-green" style={{ fontSize: 14, padding: "6px 12px" }}>Operational</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)" }}>
        <StatCard title="Temperature" value="24°C" icon={Thermometer} color="var(--orange)" />
        <StatCard title="Wind Speed" value="12 km/h" icon={Wind} color="var(--cyan)" />
        <StatCard title="Battery" value="89%" icon={Battery} color="var(--green)" />
        <StatCard title="Uptime" value="99.9%" icon={Activity} color="var(--purple)" />
      </div>

      <div className="card" style={{ padding: "var(--space-5)" }}>
         <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 var(--space-4) 0" }}>24h Temperature Trend</h2>
         <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temperatureData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Line type="monotone" dataKey="temp" stroke="var(--purple)" strokeWidth={3} dot={{ r: 4, fill: "var(--purple)", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="card" style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: 16 }}>
       <div style={{ width: 48, height: 48, borderRadius: 12, background: `rgba(200,200,200,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          <Icon size={24} />
       </div>
       <div>
         <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{title}</div>
         <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{value}</div>
       </div>
    </div>
  );
}
