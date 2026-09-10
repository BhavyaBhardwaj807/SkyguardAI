"use client";
import { Search, Download, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function CommandBar({ onSearch, onExport, onRefresh }) {
  const [query, setQuery] = useState("");
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    onRefresh && onRefresh();
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--surface-hover)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 10px",
          minWidth: 180,
        }}
      >
        <Search size={14} color="var(--text-dim)" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch && onSearch(e.target.value);
          }}
          placeholder="Search station ID..."
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: 13,
            width: "100%",
          }}
        />
      </div>
      <button onClick={onExport} style={iconButtonStyle} className="row-hover" aria-label="Export">
        <Download size={14} />
        <span>Export</span>
      </button>
      <button onClick={handleRefresh} style={iconButtonStyle} className="row-hover" aria-label="Refresh">
        <RefreshCw size={14} style={{ transform: spinning ? "rotate(360deg)" : "none", transition: "transform 600ms ease" }} />
        <span>Refresh</span>
      </button>
    </div>
  );
}

const iconButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  fontSize: 13,
  color: "var(--text-muted)",
  cursor: "pointer",
};
