"use client";

import HeaderNav from "../../components/HeaderNav";

export default function DashboardLayout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <HeaderNav />
      <main
        style={{
          flex: 1,
          padding: "var(--space-4) var(--space-5)",
          maxWidth: "1440px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {children}
      </main>
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "10px 20px",
          fontSize: "11px",
          color: "var(--text-dim)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-subtle)",
        }}
      >
        <div>
          SKYGUARD AI // Weather Data Quality Assurance System &middot; 6 Northern India AWS Nodes &middot; Scikit-learn Isolation Forest v2
        </div>
        <div>
          Audited Correction Pipeline &middot; Raw observations are never mutated or replaced
        </div>
      </footer>
    </div>
  );
}
