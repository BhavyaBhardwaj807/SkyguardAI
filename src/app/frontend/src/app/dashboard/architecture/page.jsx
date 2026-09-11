"use client";

const PIPELINE_TIERS = [
  {
    layer: "Tier 1: Edge Observation",
    title: "Meteorological Sensor Network",
    description: "6 localized Automatic Weather Stations deployed in Northern India with synchronized reporting intervals.",
    components: [
      "Physical channels: Ambient Temperature (°C), Barometric Pressure (hPa), Relative Humidity (%)",
      "Fixed interval reporting with ISO 8601 UTC timestamps",
      "Spatial coordinates: 28.45°N–28.98°N, 77.02°E–77.70°E; Elevations 198m–242m",
    ],
    status: "6 Active Stations",
    color: "var(--status-normal)",
  },
  {
    layer: "Tier 2: Ingestion & Replay",
    title: "Durable Backend Service",
    description: "Guarantees atomic observation commits, idempotent receipts, and scheduled scenario replays.",
    components: [
      "Strict schema validation via shared TypeScript contracts",
      "Transactional batch ingestion: identical payloads deduplicated; conflicts return 409",
      "Replay orchestrator with step, pause, resume, and adjustable speed multiplier (0.5x–5x)",
      "Server-Sent Events (SSE) stream for real-time browser updates with REST fallback",
    ],
    status: "Port 4000",
    color: "var(--accent)",
  },
  {
    layer: "Tier 3: Inference & Verification",
    title: "Machine Learning Quality Engine",
    description: "Altitude-adjusted Isolation Forest evaluating observations for sensor faults versus extreme weather.",
    components: [
      "Causal inference: evaluates historical observations strictly backwards from event timestamp without future leakage",
      "Continuous anomaly scoring float [0.00, 1.00] paired with physical limit checks",
      "Verdicts: normal, suspected_fault, suspected_drift, extreme_weather, insufficient_data",
      "Spatial consensus validation across neighboring stations within 100 km",
    ],
    status: "Port 8000",
    color: "var(--status-warning)",
  },
  {
    layer: "Tier 4: Storage & Governance",
    title: "Audited Data & Review Store",
    description: "Maintains deterministic health scores, non-destructive correction proposals, and operator decisions.",
    components: [
      "Non-destructive storage: raw physical observations are permanently preserved and never overwritten",
      "Deterministic 5-factor Sensor Health scoring (0–100) computed per channel",
      "Spatial self-healing pipeline: distance-weighted estimates (requires confidence ≥0.70)",
      "Audited operator review workflow: accepted and rejected decisions recorded with timestamps",
    ],
    status: "PostgreSQL 17",
    color: "var(--text-muted)",
  },
];

export default function SystemArchitecturePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          paddingBottom: "16px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            margin: 0,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          System Architecture
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "var(--text-muted)",
            margin: "6px 0 0 0",
            lineHeight: 1.5,
          }}
        >
          Four-tier data pipeline from edge meteorological observations to audited storage and operator governance.
        </p>
      </div>

      {/* 4-Tier Pipeline Stack */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {PIPELINE_TIERS.map((tier) => (
          <div
            key={tier.layer}
            className="card"
            style={{
              padding: "20px 24px",
              borderLeft: `3px solid ${tier.color}`,
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
              <div>
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: tier.color,
                  }}
                >
                  {tier.layer}
                </span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "17px", fontWeight: 600, color: "var(--text)" }}>
                  {tier.title}
                </h3>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: "12px" }}>
                {tier.status}
              </span>
            </div>

            <p style={{ fontSize: "14.5px", color: "var(--text)", margin: "0 0 14px 0", lineHeight: 1.5 }}>
              {tier.description}
            </p>

            <div
              style={{
                background: "var(--bg)",
                borderRadius: "var(--radius-md)",
                padding: "14px 18px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>
                Technical Guarantees
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                {tier.components.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
