"use client";
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const modelData = [
  { name: "V1.0", accuracy: 82, recall: 75, precision: 85 },
  { name: "V1.2", accuracy: 85, recall: 79, precision: 88 },
  { name: "V2.0", accuracy: 91, recall: 85, precision: 92 },
  { name: "V2.1", accuracy: 94, recall: 90, precision: 95 },
  { name: "V3 (Beta)", accuracy: 96, recall: 93, precision: 97 },
];

export default function ModelEvaluation() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>Model Evaluation</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--space-4)" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
           <div className="card" style={{ padding: "var(--space-5)", background: "var(--surface)", position: "relative", overflow: "hidden" }}>
             <div style={{ position: "absolute", top: 0, right: 0, width: "70%", height: "70%", background: "var(--gradient-overview)", filter: "blur(60px)", opacity: 0.8, borderRadius: "50%" }} />
             <div style={{ position: "relative", zIndex: 1 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px 0" }}>Current Champion Model</h2>
                <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 4, color: "var(--text)" }}>V3 (Beta)</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Deployed to staging for 14 days.</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <MetricRow label="Global Accuracy" value="96.4%" color="var(--purple)" />
                  <MetricRow label="False Positives" value="0.2%" color="var(--yellow)" />
                  <MetricRow label="Latency" value="12ms" color="var(--cyan)" />
                </div>
             </div>
           </div>
           
           <div className="card" style={{ padding: "var(--space-5)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px 0" }}>Recent Deployments</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>V3 (Beta)</span> <span className="badge badge-green">Staging</span></div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>V2.1</span> <span className="badge" style={{ background: "rgba(168,85,247,0.1)", color: "var(--purple)" }}>Production</span></div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>V2.0</span> <span className="badge" style={{ background: "var(--border-soft)", color: "var(--text-muted)" }}>Retired</span></div>
              </div>
           </div>
        </div>

        <div className="card" style={{ padding: "var(--space-5)" }}>
           <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 var(--space-4) 0" }}>Performance Evolution</h2>
           <div style={{ height: 400 }}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} domain={[60, 100]} />
                  <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", background: "var(--surface)", color: "var(--text)" }} />
                  <Legend wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                  <Bar dataKey="accuracy" name="Accuracy %" fill="var(--purple)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="precision" name="Precision %" fill="var(--cyan)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="recall" name="Recall %" fill="var(--yellow)" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
        <span style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <span style={{ fontWeight: 600, color: "var(--text)" }}>{value}</span>
    </div>
  );
}
