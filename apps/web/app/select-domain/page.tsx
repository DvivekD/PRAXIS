"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

const DOMAINS = [
  {
    id: "engineering",
    title: "Software Engineering",
    desc: "Debug production systems, design architecture, ship under pressure.",
    icon: "💻",
    gradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    tags: ["Full Stack", "Backend", "Systems"],
  },
  {
    id: "product",
    title: "Product Management",
    desc: "Navigate stakeholder conflicts, prioritize ruthlessly, ship the right thing.",
    icon: "📋",
    gradient: "linear-gradient(135deg, #8b5cf6, #a855f7)",
    tags: ["Strategy", "Analytics", "Leadership"],
  },
  {
    id: "finance",
    title: "Finance & Operations",
    desc: "Model risk, optimize cash flow, make decisions with incomplete data.",
    icon: "📊",
    gradient: "linear-gradient(135deg, #10b981, #34d399)",
    tags: ["Modeling", "Risk", "Operations"],
  },
  {
    id: "data",
    title: "Data Science",
    desc: "Wrangle messy datasets, build pipelines, extract signal from noise.",
    icon: "🧪",
    gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    tags: ["ML", "Analytics", "Pipelines"],
  },
];

export default function SelectDomainPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleLaunch = () => {
    if (!selected) return;
    // Route user to the dashboard to select a live company problem
    router.push(`/seeker/dashboard?domain=${selected}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050510", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "20%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", filter: "blur(100px)" }} />
      </div>

      {/* Back nav */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ position: "relative", zIndex: 1, padding: "24px 48px" }}
      >
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back
        </button>
      </motion.div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "40px 24px 100px" }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Step 1 — Domain Selection</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Choose Your Arena</h1>
          <p style={{ fontSize: 16, color: "#71717a", margin: 0 }}>Select the domain that matches the role you're applying for.</p>
        </motion.div>

        {/* Domain Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 48 }}>
          {DOMAINS.map((domain, i) => (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelected(domain.id)}
              style={{
                padding: 28,
                borderRadius: 16,
                border: `2px solid ${selected === domain.id ? "#6366f1" : "rgba(255,255,255,0.06)"}`,
                background: selected === domain.id ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {selected === domain.id && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: domain.gradient }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{domain.icon}</span>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{domain.title}</h3>
              </div>
              <p style={{ fontSize: 14, color: "#a1a1aa", margin: "0 0 14px", lineHeight: 1.6 }}>{domain.desc}</p>
              <div style={{ display: "flex", gap: 8 }}>
                {domain.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "#a1a1aa", fontWeight: 500 }}>{tag}</span>
                ))}
              </div>
              {selected === domain.id && (
                <div style={{ position: "absolute", top: 16, right: 16 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Launch button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ textAlign: "center" }}>
          <motion.button
            whileHover={selected ? { scale: 1.04, y: -2 } : {}}
            whileTap={selected ? { scale: 0.97 } : {}}
            onClick={handleLaunch}
            disabled={!selected}
            style={{
              padding: "16px 48px",
              fontSize: 16,
              fontWeight: 600,
              color: "#fff",
              background: selected ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "#27272a",
              border: "none",
              borderRadius: 12,
              cursor: selected ? "pointer" : "not-allowed",
              opacity: selected ? 1 : 0.5,
              boxShadow: selected ? "0 8px 30px rgba(99,102,241,0.4)" : "none",
              transition: "all 0.3s",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Enter Dashboard
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
