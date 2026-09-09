"use client";
const STATUS_MAP = {
  normal: { label: "Normal", color: "var(--status-normal)", bg: "var(--status-normal-dim)" },
  warning: { label: "Warning", color: "var(--status-warning)", bg: "var(--status-warning-dim)" },
  critical: { label: "Critical", color: "var(--status-critical)", bg: "var(--status-critical-dim)" },
  offline: { label: "Offline", color: "var(--status-offline)", bg: "var(--status-offline-dim)" },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.offline;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-data)",
        fontSize: 11,
        color: s.color,
        background: s.bg,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

export function statusFromScore(severity) {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "normal";
}
