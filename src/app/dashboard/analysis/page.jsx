"use client";
"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const historicalData = [
  { month: "Jan", anomalies: 45, alerts: 12 },
  { month: "Feb", anomalies: 52, alerts: 18 },
  { month: "Mar", anomalies: 38, alerts: 8 },
  { month: "Apr", anomalies: 65, alerts: 25 },
  { month: "May", anomalies: 48, alerts: 15 },
  { month: "Jun", anomalies: 55, alerts: 19 },
  { month: "Jul", anomalies: 40, alerts: 10 },
];

export default function HistoricalAnalysis() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>Historical Analysis</h1>
        <select style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "8px 16px", fontSize: 13, outline: "none", color: "var(--text)" }}>
           <option>Last 7 Months</option>
           <option>Last 12 Months</option>
        </select>
      </div>

      <div className="card" style={{ padding: "var(--space-5)" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>Total Anomalies Detected</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 700 }}>343</span>
                <span className="badge badge-red" style={{ fontSize: 11 }}>+12% YoY</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--purple)" }}/> Anomalies</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--cyan)" }}/> Critical Alerts</div>
            </div>
          </div>
         <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--purple)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="anomalies" stroke="var(--purple)" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomalies)" />
                <Area type="monotone" dataKey="alerts" stroke="var(--cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorAlerts)" />
              </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}
