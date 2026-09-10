"use client";
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Server, AlertTriangle, Activity, ShieldAlert, ChevronRight } from "lucide-react";

// Mock Data
const temperatureData = [
  { time: "12AM", temp: 18, normal: 25 },
  { time: "2AM", temp: 17, normal: 24 },
  { time: "4AM", temp: 16, normal: 23 },
  { time: "6AM", temp: 17, normal: 22 },
  { time: "8AM", temp: 21, normal: 25 },
  { time: "10AM", temp: 25, normal: 27 },
  { time: "12PM", temp: 29, normal: 28 },
  { time: "2PM", temp: 31, normal: 29 },
  { time: "4PM", temp: 33, normal: 30 }, // Spike
  { time: "6PM", temp: 32, normal: 28 },
  { time: "8PM", temp: 27, normal: 26 },
  { time: "NOW", temp: 32, normal: 25 },
];

const anomalyFeed = [
  { station: "AWS_005", cause: "temperature sensor fault", conf: "88%", time: "2 min ago", level: "CRITICAL" },
  { station: "AWS_003", cause: "possible drift", conf: "70%", time: "40 min ago", level: "WARNING" },
];

export default function Overview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>Dashboard Overview</h1>
      </div>

      {/* Top 4 Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)" }}>
        <StatCard title="Stations online" value="7" icon={Server} color="var(--purple)" trend="All nominal" />
        <StatCard title="Active anomalies" value="2" icon={AlertTriangle} color="var(--orange)" trend="↑ 2 from last hour" isAlert />
        <StatCard title="Critical stations" value="1" icon={ShieldAlert} color="#F87171" trend="Needs attention" isAlert />
        <StatCard title="Network health" value="83%" icon={Activity} color="var(--cyan)" trend="↓ 5/7 healthy" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-4)" }}>
        
        {/* Left Column: Temperature Trends */}
        <div className="card" style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-5)" }}>
             <div>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)", letterSpacing: 0.5, margin: "0 0 4px 0" }}>TEMPERATURE TRENDS</h2>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>AWS_005 • Last 24 hours</div>
             </div>
             <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
               <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 2, background: "var(--cyan)" }}/> Temperature</div>
               <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 2, background: "var(--border)" }}/> Normal range</div>
             </div>
          </div>
          
          <div style={{ height: 260, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temperatureData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(val) => `${val}°`} domain={[14, 35]} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Line type="monotone" dataKey="normal" stroke="var(--border)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="temp" stroke="var(--cyan)" strokeWidth={3} dot={{ r: 4, fill: "var(--cyan)", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ marginTop: "var(--space-4)", fontSize: 13, color: "#F87171", fontWeight: 500 }}>
             AI DETECTION • AWS_005 • +8.4°C from expected • 94% probability
          </div>
        </div>

        {/* Right Column: AI Insight */}
        <div className="card" style={{ padding: "var(--space-5)", background: "var(--surface)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "var(--gradient-overview)", filter: "blur(60px)", opacity: 0.6, borderRadius: "50%" }} />
          
          <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
               <h2 style={{ fontSize: 12, fontWeight: 600, color: "var(--purple)", letterSpacing: 0.5, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldAlert size={14} /> SKYGUARD AI INSIGHT
               </h2>
               <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Analyzed 2 min ago</div>
            </div>
            
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 var(--space-5) 0", color: "var(--text)" }}>
               <strong style={{ color: "#F87171" }}>AWS_005</strong> is showing an abnormal reading compared with its recent baseline.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
               <ProgressBar label="Anomaly probability" value="94%" color="#F87171" fill={94} />
               <ProgressBar label="Model confidence" value="88%" color="var(--cyan)" fill={88} />
               
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-soft)", paddingTop: "var(--space-3)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Deviation from baseline</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>+17.8°C</span>
               </div>
               
               <div style={{ fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>Likely cause: </span>
                  <span style={{ fontWeight: 500, color: "var(--text)" }}>temperature sensor fault</span>
               </div>
            </div>
            
            <button style={{ marginTop: "var(--space-5)", background: "rgba(56,189,248,0.1)", color: "var(--cyan)", border: "none", borderRadius: 16, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "max-content" }}>
               View analysis
            </button>
          </div>
        </div>

      </div>

      {/* Bottom: Anomaly Feed */}
      <div className="card" style={{ padding: "var(--space-5)" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
             <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)", letterSpacing: 0.5, margin: 0 }}>AI ANOMALY FEED</h2>
             <div style={{ fontSize: 12, color: "#F87171", fontWeight: 600 }}>2 ACTIVE</div>
         </div>
         
         <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {anomalyFeed.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", padding: "var(--space-4) 0", borderBottom: idx !== anomalyFeed.length - 1 ? "1px solid var(--border-soft)" : "none", borderLeft: `3px solid ${item.level === 'CRITICAL' ? '#F87171' : 'var(--orange)'}`, paddingLeft: 16 }}>
                 <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: item.level === 'CRITICAL' ? '#F87171' : 'var(--orange)', fontWeight: 600, marginBottom: 4 }}>{item.level}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{item.station}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>{item.cause}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: item.level === 'CRITICAL' ? '#F87171' : 'var(--orange)', fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                       Investigate <ChevronRight size={14} />
                    </div>
                 </div>
                 <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Confidence <span style={{ fontWeight: 600, color: "var(--text)" }}>{item.conf}</span></div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Detected <span style={{ color: "var(--text)" }}>{item.time}</span></div>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend, isAlert }) {
  return (
    <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 12 }}>
       <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
          <Icon size={16} />
          <span style={{ fontSize: 13 }}>{title}</span>
       </div>
       <div style={{ fontSize: 32, fontWeight: 700, color: isAlert ? color : "var(--text)" }}>
          {value}
       </div>
       <div style={{ fontSize: 12, color: isAlert ? color : "var(--text-muted)" }}>
          {trend}
       </div>
    </div>
  );
}

function ProgressBar({ label, value, fill, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontWeight: 600, color: "var(--text)" }}>{value}</span>
      </div>
      <div style={{ width: "100%", height: 6, background: "var(--border-soft)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${fill}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}
