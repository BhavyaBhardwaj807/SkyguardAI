"use client";

import { useState } from "react";
import { IconSearch, IconDownload, IconRefresh } from "./Icons";

export default function CommandBar({ onSearch, onExport, onRefresh }) {
  const [query, setQuery] = useState("");
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    if (onRefresh) onRefresh();
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
          padding: "4px 8px",
          minWidth: 180,
          border: "1px solid var(--border)",
        }}
      >
        <IconSearch size={13} color="var(--text-dim)" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onSearch) onSearch(e.target.value);
          }}
          placeholder="Search station ID..."
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: 12,
            width: "100%",
            fontFamily: "inherit",
          }}
        />
      </div>
      <button onClick={onExport} className="btn" aria-label="Export">
        <IconDownload size={13} />
        <span>Export</span>
      </button>
      <button onClick={handleRefresh} className="btn" aria-label="Refresh">
        <IconRefresh
          size={13}
          style={{
            transform: spinning ? "rotate(360deg)" : "none",
            transition: "transform 600ms ease",
          }}
        />
        <span>Refresh</span>
      </button>
    </div>
  );
}
