"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

const DOMAINS = [
  {
    id: "engineering",
    title: "Software Engineering",
    desc: "Debug a critical concurrency double-charge race condition in a live SSH Linux terminal.",
    icon: "💻",
    gradient: "linear-gradient(135deg, #00ff41, #10b981)",
    accent: "#00ff41",
    tags: ["Live Terminal", "Concurrency", "Jest Test Suite"],
  },
  {
    id: "sales",
    title: "Sales & Partnerships",
    desc: "Conduct a live voice call with Sam Jenkins (Nordic Goods) to secure a $250k enterprise renewal.",
    icon: "📞",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    accent: "#f59e0b",
    tags: ["Softphone Console", "Gemini Live Voice", "Demo Star ⭐"],
  },
  {
    id: "product",
    title: "Product Management",
    desc: "Triage incoming executive stakeholder emails and enforce a Black Friday Sev-1 freeze.",
    icon: "📋",
    gradient: "linear-gradient(135deg, #818cf8, #6366f1)",
    accent: "#818cf8",
    tags: ["Executive Inbox", "Sev-1 Triage", "Trade-offs"],
  },
  {
    id: "data",
    title: "Data & Analytics",
    desc: "Investigate an anomalous 40% DAU spike and restore query integrity using DISTINCT.",
    icon: "📊",
    gradient: "linear-gradient(135deg, #06b6d4, #0284c7)",
    accent: "#06b6d4",
    tags: ["SQL Workspace", "Chart Animation", "Data Integrity"],
  },
  {
    id: "sre",
    title: "SRE & Incident Ops",
    desc: "Take command of an active Sev-1 war room, diagnose 42% 5xx errors, and execute a 1-click rollback.",
    icon: "🚨",
    gradient: "linear-gradient(135deg, #ef4444, #b91c1c)",
    accent: "#ef4444",
    tags: ["Incident War Room", "Telemetry Charts", "Rollback"],
  },
  {
    id: "support",
    title: "Customer Support",
    desc: "Spot duplicate billing patterns across the ticket queue and execute a unified batch escalation.",
    icon: "🎧",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    accent: "#10b981",
    tags: ["Helpdesk Queue", "SLA Timers", "Tone Selector"],
  },
  {
    id: "brand",
    title: "Social & Brand Crisis",
    desc: "Defuse a viral social media backlash with an authentic, accountable statement that swings the sentiment dial.",
    icon: "📱",
    gradient: "linear-gradient(135deg, #ec4899, #be185d)",
    accent: "#ec4899",
    tags: ["Crisis Command", "Sentiment Dial", "Public Statement"],
  },
];

export default function SelectDomainPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>("engineering");

  const handleLaunch = () => {
    if (!selected) return;
    router.push(`/seeker/dashboard?domain=${selected}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#05070d", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      {/* Background glow */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "20%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", filter: "blur(120px)" }} />
      </div>

      {/* Back nav */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ position: "relative", zIndex: 1, padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to Home
        </button>
        <div style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", border: "1px solid #f59e0b40", padding: "3px 8px", borderRadius: 4, background: "rgba(245,158,11,0.1)" }}>
          ⚡ AURA COMMERCE // BLACK FRIDAY CRISIS SIMULATION
        </div>
      </motion.div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "20px 24px 80px" }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
            [ STEP 1 // WORKPLACE DOMAIN ]
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Choose Your Operational Arena
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, maxWidth: 640, marginInline: "auto" }}>
            Step into a realistic, domain-tailored software environment. Each simulation takes place inside Aura Commerce during the high-stakes hours before Black Friday.
          </p>
        </motion.div>

        {/* Domain Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 36 }}>
          {DOMAINS.map((domain, i) => {
            const isSelected = selected === domain.id;
            return (
              <motion.div
                key={domain.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(domain.id)}
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? domain.accent : "rgba(255,255,255,0.08)"}`,
                  background: isSelected ? "rgba(255,255,255,0.05)" : "#0b101c",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isSelected && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: domain.gradient }} />
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{domain.icon}</span>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "#fff" }}>{domain.title}</h3>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>{domain.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {domain.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: isSelected ? "rgba(255,255,255,0.1)" : "#1e293b",
                        color: isSelected ? domain.accent : "#94a3b8",
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Launch button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
          <motion.button
            whileHover={selected ? { scale: 1.03 } : {}}
            whileTap={selected ? { scale: 0.98 } : {}}
            onClick={handleLaunch}
            disabled={!selected}
            style={{
              padding: "14px 44px",
              fontSize: 15,
              fontWeight: 800,
              color: "#fff",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ENTER {selected?.toUpperCase()} DASHBOARD ▶
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
