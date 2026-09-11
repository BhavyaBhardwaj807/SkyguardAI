"use client";

import Link from "next/link";
import { useTheme } from "../theme/ThemeContext";
import {
  IconArrowRight,
  IconSun,
  IconMoon,
} from "../components/Icons";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          maxWidth: "1160px",
          width: "100%",
          margin: "0 auto",
          padding: "24px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 700, fontSize: "17px", letterSpacing: "-0.3px", color: "var(--text)" }}>
            SkyGuard
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              background: "var(--surface)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            Weather Station Quality
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            style={{ padding: "8px", width: "36px", height: "36px" }}
            title="Toggle theme"
          >
            {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
          <Link href="/dashboard" className="btn btn-primary">
            <span>Open Dashboard</span>
            <IconArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <section
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "80px 24px 60px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(34px, 5vw, 54px)",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.8px",
              color: "var(--text)",
              margin: 0,
            }}
          >
            Weather station monitoring that flags bad data before it spreads.
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: "680px",
              margin: 0,
            }}
          >
            SkyGuard continuously validates automatic weather station telemetry against neighboring sensors and physical baselines, catching sensor faults, drifts, and dropouts before they corrupt forecasts.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "8px" }}>
            <Link
              href="/dashboard"
              className="btn btn-primary"
              style={{ padding: "12px 24px", fontSize: "15px", borderRadius: "var(--radius)" }}
            >
              <span>Explore the Dashboard</span>
              <IconArrowRight size={15} />
            </Link>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Interactive local demo &middot; 6 regional stations &middot; Precomputed feature replay
            </span>
          </div>

          {/* Product Preview Card */}
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "840px",
              marginTop: "48px",
              padding: "24px",
              textAlign: "left",
              background: "var(--surface)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "16px",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Station Incident &middot; Ridge Sector
                </div>
                <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>
                  River Delta (AWS005) &mdash; Temperature Spike
                </div>
              </div>
              <span className="badge badge-critical" style={{ fontSize: "12px", padding: "4px 10px" }}>
                Suspected Sensor Fault
              </span>
            </div>

            {/* Visual Metric Comparison */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Reported Value</div>
                <div className="data-mono" style={{ fontSize: "24px", fontWeight: 700, color: "var(--status-critical)", marginTop: "4px" }}>
                  42.7°C
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>Abrupt +17.8°C divergence</div>
              </div>

              <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Regional Neighbor Average</div>
                <div className="data-mono" style={{ fontSize: "24px", fontWeight: 600, color: "var(--text)", marginTop: "4px" }}>
                  25.3°C
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>Confirmed by AWS001 &amp; AWS002</div>
              </div>

              <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Proposed Correction</div>
                <div className="data-mono" style={{ fontSize: "24px", fontWeight: 600, color: "var(--accent)", marginTop: "4px" }}>
                  25.4°C
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>Audited distance estimate</div>
              </div>
            </div>

            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Nearby stations reported steady ambient readings between 24°C and 26°C with no accompanying pressure drop. SkyGuard isolated the sudden spike as localized thermistor failure, preventing the extreme reading from falsifying regional meteorological trends.
            </p>
          </div>
        </section>

        {/* Workflow & Key Benefits */}
        <section
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            padding: "40px 24px 80px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "26px", fontWeight: 700, color: "var(--text)" }}>
              How SkyGuard protects weather data integrity
            </h2>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginTop: "8px" }}>
              Three complementary validation layers built for operational reliability.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "28px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "17px", fontWeight: 600, color: "var(--text)" }}>
                Spatial Consensus
              </div>
              <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                Weather events don't stop at station boundaries. When a sensor reports extreme shifts, SkyGuard compares readings against spatial neighbors to verify whether a change is a genuine regional front or an isolated hardware defect.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "17px", fontWeight: 600, color: "var(--text)" }}>
                Audited Self-Healing
              </div>
              <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                Forecasting pipelines need complete data series. When faults occur, SkyGuard computes distance-weighted substitute values with confidence scores for review while keeping raw measurements strictly immutable.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "17px", fontWeight: 600, color: "var(--text)" }}>
                Long-Term Health Scoring
              </div>
              <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                Sensors degrade before they fail completely. SkyGuard calculates channel-specific degradation based on variance change, calibration drift, and signal persistence to notify technicians before probes go offline.
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: "10px 20px" }}>
              <span>Enter Operations Dashboard &rarr;</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "24px 24px",
          fontSize: "13px",
          color: "var(--text-muted)",
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            SkyGuard AI &middot; Local Weather Data Quality Platform Demo
          </div>
          <div style={{ display: "flex", gap: "20px" }}>
            <Link href="/dashboard" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Dashboard</Link>
            <Link href="/dashboard/stations" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Stations</Link>
            <Link href="/dashboard/map" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Live Map</Link>
            <Link href="/dashboard/anomalies" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Anomalies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
