"use client";

const VERDICT_MAP = {
  normal: {
    label: "NORMAL",
    className: "badge-normal",
    dotClass: "normal",
  },
  suspected_fault: {
    label: "SUSPECTED FAULT",
    className: "badge-critical",
    dotClass: "critical",
  },
  critical: {
    label: "CRITICAL",
    className: "badge-critical",
    dotClass: "critical",
  },
  suspected_drift: {
    label: "DRIFT WARNING",
    className: "badge-warning",
    dotClass: "warning",
  },
  warning: {
    label: "WARNING",
    className: "badge-warning",
    dotClass: "warning",
  },
  extreme_weather: {
    label: "EXTREME WEATHER",
    className: "badge-warning",
    dotClass: "warning",
  },
  insufficient_data: {
    label: "INSUFFICIENT DATA",
    className: "badge-stale",
    dotClass: "stale",
  },
  offline: {
    label: "OFFLINE",
    className: "badge-stale",
    dotClass: "stale",
  },
  resolved: {
    label: "RESOLVED",
    className: "badge-normal",
    dotClass: "normal",
  },
};

export default function StatusBadge({ status, verdict, showDot = true }) {
  const key = (verdict || status || "normal").toLowerCase();
  const config = VERDICT_MAP[key] || VERDICT_MAP.insufficient_data;

  return (
    <span className={`badge ${config.className}`}>
      {showDot && <span className={`status-dot ${config.dotClass}`} />}
      <span>{config.label}</span>
    </span>
  );
}
