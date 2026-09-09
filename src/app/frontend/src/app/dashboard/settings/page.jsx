"use client";
"use client";
import { useState } from "react";
import { User, Bell, Shield, Moon, Sun, Key } from "lucide-react";
import { useTheme } from "../../../theme/ThemeContext";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>Settings</h1>
      </div>

      {/* Account Settings */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
         <div style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "rgba(168,85,247,0.1)", color: "var(--purple)", padding: 8, borderRadius: 8 }}>
               <User size={20} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Account Profile</h2>
         </div>
         <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", gap: "var(--space-4)" }}>
               <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Full Name</label>
                  <input type="text" defaultValue="Admin User" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", outline: "none" }} />
               </div>
               <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Email Address</label>
                  <input type="email" defaultValue="admin@skyguard.ai" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", outline: "none" }} />
               </div>
            </div>
            <button style={{ background: "var(--purple)", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "max-content" }}>
               Save Changes
            </button>
         </div>
      </div>

      {/* Preferences & Notifications */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
         <div style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "rgba(56,189,248,0.1)", color: "var(--cyan)", padding: 8, borderRadius: 8 }}>
               <Bell size={20} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Preferences</h2>
         </div>
         <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
               <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Push Notifications</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Receive alerts on your device for critical anomalies.</div>
               </div>
               <Toggle checked={notifications} onChange={() => setNotifications(!notifications)} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
               <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Email Reports</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Receive daily summary reports of system health.</div>
               </div>
               <Toggle checked={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
               <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Dark Mode</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Toggle the application theme manually.</div>
               </div>
               <button onClick={toggleTheme} style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text)" }}>
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
               </button>
            </div>

         </div>
      </div>

      {/* Security */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
         <div style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "rgba(251,191,36,0.1)", color: "var(--yellow)", padding: 8, borderRadius: 8 }}>
               <Key size={20} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>API & Security</h2>
         </div>
         <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
               <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>Node.js API Key</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace", background: "var(--surface-hover)", padding: "4px 8px", borderRadius: 4 }}>sk_test_51Nx...</div>
               </div>
               <button style={{ background: "transparent", color: "var(--cyan)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Regenerate
               </button>
            </div>
         </div>
      </div>

    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div 
      onClick={onChange}
      style={{
         width: 44,
         height: 24,
         borderRadius: 12,
         background: checked ? "var(--purple)" : "var(--border-soft)",
         position: "relative",
         cursor: "pointer",
         transition: "background 0.2s"
      }}
    >
       <div style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          transition: "left 0.2s",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
       }} />
    </div>
  );
}
