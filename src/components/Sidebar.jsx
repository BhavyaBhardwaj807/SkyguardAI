"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  MapPin,
  AlertTriangle,
  CircleDot,
  History,
  HeartPulse,
  Sparkles,
  Cpu,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useTheme } from "../theme/ThemeContext";

const MAIN_LINKS = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/dashboard/map", label: "Live map", icon: MapPin },
  { to: "/dashboard/anomalies", label: "Active anomalies", icon: AlertTriangle },
  { to: "/demo", label: "Replay Simulation", icon: CircleDot },
];

const ANALYTICS_LINKS = [
  { to: "/dashboard/stations/AWS_001", label: "Station details", icon: CircleDot, color: "#9333EA" },
  { to: "/dashboard/analysis", label: "Historical", icon: History, color: "#F97316" },
  { to: "/dashboard/health", label: "Sensor health", icon: HeartPulse, color: "#06B6D4" },
];

const AI_LINKS = [
  { to: "/dashboard/evaluation", label: "Model evaluation", icon: Sparkles, initial: "ME", color: "#10B981" },
  { to: "/dashboard/architecture", label: "Architecture", icon: Cpu, initial: "AR", color: "#F59E0B" },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.nav
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        flexShrink: 0,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        position: "relative"
      }}
    >
      <style>{`
        nav::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between", marginBottom: "var(--space-5)", flexDirection: isCollapsed ? "column" : "row", gap: isCollapsed ? "var(--space-4)" : 0 }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--gradient-overview)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <Sparkles size={18} color="var(--purple)" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}
              >
                SkyGuard
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexDirection: isCollapsed ? "column" : "row" }}>
          {!isCollapsed && (
            <button
              onClick={toggleTheme}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0
              }}
            >
               <div style={{ width: 12, height: 12, borderRadius: "50%", background: theme === "dark" ? "var(--purple)" : "var(--text-muted)" }} />
            </button>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text)",
              flexShrink: 0
            }}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: "var(--space-5)", display: "flex", justifyContent: "center" }}>
        {isCollapsed ? (
          <Search size={20} color="var(--text-muted)" />
        ) : (
          <>
            <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search"
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                outline: "none",
              }}
            />
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", fontSize: 12 }}>/</div>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <Section title="MAIN" links={MAIN_LINKS} isCollapsed={isCollapsed} />
        <Section title="ANALYTICS" links={ANALYTICS_LINKS} isInbox isCollapsed={isCollapsed} />
        <Section title="AI MODULES" links={AI_LINKS} isTeam isCollapsed={isCollapsed} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <img
              src="https://i.pravatar.cc/150?u=admin"
              alt="Admin"
              style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }}
            />
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Admin User (You)</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>admin@skyguard.ai</div>
              </motion.div>
            )}
          </div>
          {!isCollapsed && <Settings size={18} color="var(--text-muted)" style={{ cursor: "pointer", flexShrink: 0 }} />}
        </div>
      </div>
    </motion.nav>
  );
}

function Section({ title, links, isCollapsed }) {
  const pathname = usePathname();
  
  return (
    <div style={{ marginTop: isCollapsed ? 12 : 0 }}>
      {!isCollapsed && (
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", marginBottom: "var(--space-2)", letterSpacing: 0.5, textAlign: "left" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: isCollapsed ? "center" : "stretch" }}>
        {links.map((link) => {
          const isActive = link.exact ? pathname === link.to : pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              href={link.to}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              style={{ textDecoration: "none", justifyContent: isCollapsed ? "center" : "flex-start", padding: isCollapsed ? "10px" : "8px 12px", width: isCollapsed ? 40 : "auto", height: isCollapsed ? 40 : "auto", margin: isCollapsed ? "0 auto" : 0 }}
              title={isCollapsed ? link.label : ""}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <link.icon size={18} style={{ color: "inherit", flexShrink: 0 }} />
                {!isCollapsed && <span style={{ fontSize: 14, whiteSpace: "nowrap" }}>{link.label}</span>}
              </div>
            </Link>
          );
        })}
        {title === "MAIN" && (
          <Link href="/dashboard/settings" title={isCollapsed ? "Settings" : ""} className={`sidebar-link ${pathname === "/dashboard/settings" ? "active" : ""}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", padding: isCollapsed ? "10px" : "8px 12px", width: isCollapsed ? 40 : "auto", height: isCollapsed ? 40 : "auto", margin: isCollapsed ? "0 auto" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <Settings size={18} style={{ color: "inherit", flexShrink: 0 }} />
              {!isCollapsed && <span style={{ fontSize: 14, whiteSpace: "nowrap" }}>Settings</span>}
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
