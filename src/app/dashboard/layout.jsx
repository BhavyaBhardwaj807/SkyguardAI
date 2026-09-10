"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "var(--space-5)", overflowY: "auto", background: "var(--bg)", position: "relative" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", paddingBottom: "var(--space-7)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
