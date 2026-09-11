"use client";
export default function PagePlaceholder({ title, owner, note }) {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 var(--space-3)" }}>{title}</h1>
      <div
        style={{
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius)",
          padding: "var(--space-6)",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        <div style={{ marginBottom: 4 }}>Route wired. Content owned by {owner}.</div>
        {note && <div style={{ color: "var(--text-dim)" }}>{note}</div>}
      </div>
    </div>
  );
}
