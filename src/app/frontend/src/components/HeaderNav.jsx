"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconOverview,
  IconStations,
  IconAnomalies,
  IconMap,
  IconChevronDown,
  IconSun,
  IconMoon,
  IconHealth,
  IconAnalysis,
  IconEvaluation,
  IconArchitecture,
  IconSettings,
} from "./Icons";
import { useTheme } from "../theme/ThemeContext";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Overview", icon: IconOverview },
  { href: "/dashboard/stations", label: "Stations", icon: IconStations },
  { href: "/dashboard/anomalies", label: "Anomalies", icon: IconAnomalies },
  { href: "/dashboard/map", label: "Map", icon: IconMap },
];

const SECONDARY_NAV = [
  { href: "/dashboard/health", label: "Sensor Health", icon: IconHealth },
  { href: "/dashboard/analysis", label: "Historical Quality", icon: IconAnalysis },
  { href: "/dashboard/evaluation", label: "Model Evaluation", icon: IconEvaluation },
  { href: "/dashboard/architecture", label: "System Architecture", icon: IconArchitecture },
  { href: "/dashboard/settings", label: "Settings", icon: IconSettings },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSecondaryActive = SECONDARY_NAV.some((item) =>
    pathname.startsWith(item.href)
  );

  return (
    <header
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "0 24px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Brand + Primary Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: "16px",
              letterSpacing: "-0.2px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>SkyGuard</span>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--status-normal)",
                display: "inline-block",
              }}
              title="Network Operational"
            />
          </Link>

          {/* Primary 4 Operational Destinations */}
          <nav style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {PRIMARY_NAV.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "14px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--text)" : "var(--text-secondary)",
                    textDecoration: "none",
                    background: isActive ? "var(--surface-raised)" : "transparent",
                    transition: "all var(--duration-fast) var(--ease-standard)",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Secondary Destinations Dropdown */}
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "14px",
                  fontWeight: isSecondaryActive ? 600 : 500,
                  color: isSecondaryActive ? "var(--text)" : "var(--text-secondary)",
                  background: isSecondaryActive ? "var(--surface-raised)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "inherit",
                }}
              >
                <span>System</span>
                <IconChevronDown
                  size={13}
                  style={{
                    transform: menuOpen ? "rotate(180deg)" : "none",
                    transition: "transform 150ms ease",
                  }}
                />
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "6px",
                    minWidth: "200px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    zIndex: 200,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  {SECONDARY_NAV.map((sec) => {
                    const isSecActive = pathname.startsWith(sec.href);
                    const SecIcon = sec.icon;

                    return (
                      <Link
                        key={sec.href}
                        href={sec.href}
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "13.5px",
                          color: isSecActive ? "var(--text)" : "var(--text-secondary)",
                          textDecoration: "none",
                          background: isSecActive ? "var(--surface-hover)" : "transparent",
                        }}
                      >
                        <SecIcon size={14} color="var(--text-muted)" />
                        <span>{sec.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right: Theme Toggle + Exit to Landing */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="btn btn-ghost"
            style={{ padding: "6px", borderRadius: "var(--radius-sm)", width: "32px", height: "32px" }}
          >
            {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
