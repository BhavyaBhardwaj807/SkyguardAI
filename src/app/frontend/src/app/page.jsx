"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldAlert, Activity, Cloud, Server, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "../theme/ThemeContext";

export default function Landing() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } }
  };

  const floatVariants = {
    initial: { y: 0 },
    animate: {
      y: [-10, 10, -10],
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
    }
  };

  return (
    <div style={{ height: "100vh", background: "var(--bg)", color: "var(--text)", overflowX: "hidden", overflowY: "auto", position: "relative" }}>
      
      {/* Background Orbs */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: "-10%", left: "-10%", width: "50vw", height: "50vw", background: "var(--purple)", filter: "blur(120px)", borderRadius: "50%", opacity: 0.15, zIndex: 0 }} 
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.4, 0.3] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "60vw", height: "60vw", background: "var(--cyan)", filter: "blur(150px)", borderRadius: "50%", opacity: 0.15, zIndex: 0 }} 
      />

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", padding: "var(--space-4) var(--space-6)", alignItems: "center", maxWidth: 1440, margin: "0 auto" }}>
         <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gradient-overview)", display: "flex", alignItems: "center", justifyContent: "center" }}>
               <ShieldAlert size={20} color="var(--purple)" />
            </div>
            SkyGuard AI
         </div>
         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
           <button onClick={(e) => { e.stopPropagation(); toggleTheme(); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)", padding: "10px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
             {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
           </button>
           <button 
             onClick={() => router.push("/dashboard")}
             style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 20px", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
           >
              Login <ArrowRight size={16} />
           </button>
         </div>
      </nav>

      {/* Hero */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show"
        style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "120px var(--space-6) 80px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}
      >
         <motion.div variants={itemVariants} className="badge badge-green" style={{ marginBottom: "var(--space-4)", fontSize: 13, padding: "6px 16px", borderRadius: 20 }}>
           V3 (Beta) Model Now Live
         </motion.div>
         
         <motion.h1 variants={itemVariants} style={{ fontSize: "clamp(3rem, 6vw, 5rem)", fontWeight: 800, margin: "0 0 var(--space-4) 0", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
           Intelligent Weather <br />
           <span style={{ background: "var(--gradient-text, linear-gradient(90deg, var(--purple), var(--cyan)))", WebkitBackgroundClip: "text", color: "transparent" }}>
             Anomaly Detection.
           </span>
         </motion.h1>
         
         <motion.p variants={itemVariants} style={{ fontSize: 18, color: "var(--text-muted)", maxWidth: 600, margin: "0 0 var(--space-6) 0", lineHeight: 1.6 }}>
           Monitor your sensor network in real-time. Detect drifts, predict failures, and understand the root cause with our explainable Edge AI architecture.
         </motion.p>
         
         <motion.button 
           variants={itemVariants}
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           onClick={() => router.push("/dashboard")}
           style={{ background: "var(--purple)", color: "white", border: "none", padding: "16px 32px", borderRadius: 30, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 10px 20px rgba(147,51,234,0.3)" }}
         >
            Enter Dashboard <ArrowRight size={20} />
         </motion.button>
      </motion.div>

      {/* Floating 3D Cards */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1440, margin: "0 auto", padding: "0 var(--space-6) 120px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-5)" }}>
         
         <motion.div variants={floatVariants} initial="initial" animate="animate" style={{ padding: "10px" }}>
           <FeatureCard 
              icon={Activity} 
              color="var(--cyan)" 
              title="Real-Time Streaming" 
              desc="Ingest millions of data points continuously via Kafka and Socket.IO with sub-second latency." 
           />
         </motion.div>

         <motion.div variants={floatVariants} initial="initial" animate="animate" style={{ animationDelay: "1s", padding: "10px" }}>
           <FeatureCard 
              icon={ShieldAlert} 
              color="var(--purple)" 
              title="Explainable AI" 
              desc="Our Isolation Forest models don't just alert; they provide feature-attributed reasoning." 
           />
         </motion.div>

         <motion.div variants={floatVariants} initial="initial" animate="animate" style={{ animationDelay: "2s", padding: "10px" }}>
           <FeatureCard 
              icon={Server} 
              color="var(--yellow)" 
              title="Edge Native" 
              desc="Push quantized models directly to ESP32 nodes to save bandwidth and reduce latency." 
           />
         </motion.div>

      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, color, title, desc }) {
  return (
    <div className="card glass" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)", height: "100%" }}>
       <div style={{ width: 48, height: 48, borderRadius: 12, background: `color-mix(in srgb, ${color} 15%, transparent)`, color: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={24} />
       </div>
       <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text)" }}>{title}</h3>
       <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
