"use client";
"use client";
import { Server, Database, Cloud, Cpu, ArrowRight } from "lucide-react";

export default function SystemArchitecture() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>System Architecture</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", alignItems: "center", marginTop: "var(--space-4)" }}>
         
         {/* Edge Layer */}
         <div className="card" style={{ width: "100%", maxWidth: 800, padding: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid var(--green)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
               <div style={{ padding: 12, background: "rgba(52,211,153,0.1)", color: "var(--green)", borderRadius: 12 }}>
                 <Cpu size={28} />
               </div>
               <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: 16 }}>Edge Sensors</h3>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>IoT devices collecting raw meteorological data.</div>
               </div>
            </div>
            <div className="badge badge-green">Operational (1,240 nodes)</div>
         </div>

         <ArrowRight size={24} color="var(--text-muted)" style={{ transform: "rotate(90deg)" }} />

         {/* Ingestion Layer */}
         <div className="card" style={{ width: "100%", maxWidth: 800, padding: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid var(--cyan)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
               <div style={{ padding: 12, background: "rgba(56,189,248,0.1)", color: "var(--cyan)", borderRadius: 12 }}>
                 <Cloud size={28} />
               </div>
               <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: 16 }}>Data Ingestion (Kafka)</h3>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>High-throughput stream processing layer.</div>
               </div>
            </div>
            <div className="badge" style={{ background: "rgba(56,189,248,0.1)", color: "var(--cyan)" }}>99.9% Uptime</div>
         </div>

         <ArrowRight size={24} color="var(--text-muted)" style={{ transform: "rotate(90deg)" }} />

         {/* Processing & Storage Layer */}
         <div style={{ display: "flex", gap: "var(--space-4)", width: "100%", maxWidth: 800 }}>
            <div className="card" style={{ flex: 1, padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 16, borderLeft: "4px solid var(--purple)" }}>
                <div style={{ padding: 12, background: "rgba(168,85,247,0.1)", color: "var(--purple)", borderRadius: 12, width: "max-content" }}>
                  <Server size={28} />
                </div>
                <div>
                   <h3 style={{ margin: "0 0 4px 0", fontSize: 16 }}>AI Inference Engine</h3>
                   <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Anomaly detection using V3 (Beta) model.</div>
                </div>
            </div>
            <div className="card" style={{ flex: 1, padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 16, borderLeft: "4px solid var(--yellow)" }}>
                <div style={{ padding: 12, background: "rgba(251,191,36,0.1)", color: "var(--yellow)", borderRadius: 12, width: "max-content" }}>
                  <Database size={28} />
                </div>
                <div>
                   <h3 style={{ margin: "0 0 4px 0", fontSize: 16 }}>Time-Series DB</h3>
                   <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Long-term historical storage.</div>
                </div>
            </div>
         </div>

      </div>
    </div>
  );
}
