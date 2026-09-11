"use client";
import { useState, useRef } from "react";

const WIDTH = 520;
const HEIGHT = 150;
const PAD_LEFT = 34;
const PAD_BOTTOM = 18;
const NORMAL_RANGE = [18, 28];

export default function TemperatureChart({ data }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  if (!data || !data.length) return null;

  const values = data.map((d) => d.v);
  const min = Math.min(...values, NORMAL_RANGE[0]) - 2;
  const max = Math.max(...values, NORMAL_RANGE[1]) + 2;
  const range = max - min || 1;
  const plotWidth = WIDTH - PAD_LEFT;
  const plotHeight = HEIGHT - PAD_BOTTOM;

  const xFor = (i) => PAD_LEFT + (i / (data.length - 1)) * plotWidth;
  const yFor = (v) => plotHeight - ((v - min) / range) * plotHeight;

  const points = data.map((d, i) => `${xFor(i).toFixed(1)},${yFor(d.v).toFixed(1)}`).join(" ");
  const anomalyPoint = data.find((d) => d.anomaly);
  const anomalyIndex = data.findIndex((d) => d.anomaly);

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(min + (range / yTicks) * i));

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const idx = Math.round(((relX - PAD_LEFT) / plotWidth) * (data.length - 1));
    if (idx >= 0 && idx < data.length) setHover({ idx, x: xFor(idx), y: yFor(data[idx].v) });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12, color: "var(--text-muted)" }}>
        <span>AWS_005 &#9662; &middot; Last 24 hours &#9662;</span>
        <span style={{ display: "flex", gap: 10 }}>
          <Legend color="var(--accent-blue)" label="Temperature" />
          <Legend color="var(--border)" label="Normal range" />
        </span>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <rect
          x={PAD_LEFT}
          y={yFor(NORMAL_RANGE[1])}
          width={plotWidth}
          height={yFor(NORMAL_RANGE[0]) - yFor(NORMAL_RANGE[1])}
          fill="var(--surface-hover)"
        />

        {tickValues.map((t) => (
          <g key={t}>
            <line x1={PAD_LEFT} x2={WIDTH} y1={yFor(t)} y2={yFor(t)} stroke="var(--border-soft)" strokeWidth="1" />
            <text x={0} y={yFor(t) + 3} fontSize="9" fill="var(--text-dim)">
              {t}°
            </text>
          </g>
        ))}

        <polyline points={points} fill="none" stroke="var(--accent-blue)" strokeWidth="2" />

        {anomalyPoint && (
          <circle cx={xFor(anomalyIndex)} cy={yFor(anomalyPoint.v)} r="4" fill="var(--status-critical)" stroke="var(--bg)" strokeWidth="1.5" />
        )}

        {hover && (
          <line x1={hover.x} x2={hover.x} y1={0} y2={plotHeight} stroke="var(--text-dim)" strokeWidth="1" strokeDasharray="3,3" />
        )}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)", marginTop: 4, paddingLeft: PAD_LEFT }}>
        {data.map((d) => (
          <span key={d.t}>{d.t}</span>
        ))}
      </div>

      {hover && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
          <span style={{ color: "var(--text)" }}>{data[hover.idx].t}</span> &middot; Temperature{" "}
          <span style={{ color: "var(--text)" }}>{data[hover.idx].v}°C</span>
        </div>
      )}

      {!hover && anomalyPoint && (
        <div style={{ fontSize: 12, color: "var(--status-critical)", marginTop: 6 }}>
          AI DETECTION &middot; {anomalyPoint.station_id} &middot; +{anomalyPoint.deviation}°C from expected &middot;{" "}
          {Math.round(anomalyPoint.probability * 100)}% probability
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 2, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
