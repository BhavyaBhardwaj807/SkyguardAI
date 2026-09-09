"use client";
"use client";
import { useEffect, useState } from "react";
import { api } from "../../../api/client";
import dynamic from "next/dynamic";
import { Filter, Map as MapIcon } from "lucide-react";

const MapPanel = dynamic(() => import("../../../components/MapPanel"), { ssr: false });

export default function LiveMap() {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    api.getStations().then(setStations);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>Live Map</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button style={{ 
            background: "var(--surface)", 
            border: "1px solid var(--border)", 
            borderRadius: 16, 
            padding: "8px 16px",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text)"
          }}>
            <Filter size={16} /> Filter Region
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "var(--space-4)", height: "calc(100vh - 160px)" }}>
        {/* Left Side: Mock Stats Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="card" style={{ padding: "var(--space-5)", background: "var(--surface)", position: "relative", overflow: "hidden" }}>
             <div style={{ position: "absolute", top: 0, right: 0, width: "70%", height: "70%", background: "var(--gradient-overview)", filter: "blur(60px)", opacity: 0.8, borderRadius: "50%" }} />
             <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                   <div style={{ background: "var(--purple)", color: "white", padding: 6, borderRadius: 8 }}><MapIcon size={16} /></div>
                   <span style={{ fontWeight: 600 }}>Region Status</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>94%</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Optimal coverage. 3 nodes offline.</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <MockStatRow label="Active Nodes" value="1,240" color="var(--green)" />
                  <MockStatRow label="Anomalies" value="12" color="var(--yellow)" />
                  <MockStatRow label="Bandwidth" value="45 GB/s" color="var(--cyan)" />
                </div>
             </div>
          </div>
          
          <div className="card" style={{ padding: "var(--space-5)", flex: 1, display: "flex", flexDirection: "column" }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px 0", color: "var(--text)" }}>Recent Activity</h3>
             <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
                <MockActivity title="Node AWS_001 updated" time="2 mins ago" color="var(--cyan)" />
                <MockActivity title="Firmware patch deployed" time="15 mins ago" color="var(--purple)" />
                <MockActivity title="High latency detected" time="1 hour ago" color="var(--yellow)" />
                <MockActivity title="Node AWS_002 offline" time="2 hours ago" color="var(--text-muted)" />
             </div>
          </div>
        </div>

        {/* Right Side: Map */}
        <div className="card" style={{ overflow: "hidden", position: "relative" }}>
           <div style={{ position: "absolute", top: 16, right: 16, zIndex: 1000, background: "var(--surface)", padding: 8, borderRadius: 8, border: "1px solid var(--border)", display: "flex", gap: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)" }}/> Online</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--yellow)" }}/> Warning</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--text-muted)" }}/> Offline</div>
           </div>
           <div style={{ 
             width: "100%", 
             height: "100%", 
             background: "var(--bg)", 
             backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", 
             backgroundSize: "20px 20px", 
             position: "relative",
             display: "flex",
             alignItems: "center",
             justifyContent: "center",
             overflow: "hidden"
           }}>
              <div style={{ position: "absolute", top: "30%", left: "40%", width: 12, height: 12, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 10px var(--green)" }} />
              <div style={{ position: "absolute", top: "45%", left: "55%", width: 12, height: 12, borderRadius: "50%", background: "var(--yellow)", boxShadow: "0 0 10px var(--yellow)" }} />
              <div style={{ position: "absolute", top: "60%", left: "30%", width: 12, height: 12, borderRadius: "50%", background: "var(--cyan)", boxShadow: "0 0 10px var(--cyan)" }} />
              <div style={{ position: "absolute", top: "20%", left: "70%", width: 12, height: 12, borderRadius: "50%", background: "var(--purple)", boxShadow: "0 0 10px var(--purple)" }} />
              <div style={{ position: "absolute", top: "70%", left: "65%", width: 12, height: 12, borderRadius: "50%", background: "var(--text-muted)", boxShadow: "0 0 10px var(--text-muted)" }} />
              <div style={{ background: "var(--surface)", padding: "12px 24px", borderRadius: 20, fontSize: 14, fontWeight: 600, color: "var(--text)", border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10 }}>
                Placeholder Map
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function MockStatRow({ label, value, color }) {
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

function MockActivity({ title, time, color }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <div style={{ width: 2, height: 24, background: "var(--border-soft)", marginTop: 4 }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{time}</div>
      </div>
    </div>
  );
}
