"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SCOPE_DEFINITIONS } from "../../lib/services/problemBank";

const DOMAIN_CARDS = [
  {
    id: "engineering",
    title: "Software Engineering",
    icon: "💻",
    accent: "#00ff41",
    gradient: "linear-gradient(135deg, #00ff41, #10b981)",
    desc: "Debug a critical concurrency double-charge race condition in an authentic Linux terminal & IDE.",
  },
  {
    id: "sales",
    title: "Sales & Commercial",
    icon: "📞",
    accent: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    desc: "Conduct a live call with Sam Jenkins (Nordic Goods) to save a $250k enterprise renewal.",
  },
  {
    id: "product",
    title: "Product Management",
    icon: "📋",
    accent: "#818cf8",
    gradient: "linear-gradient(135deg, #818cf8, #6366f1)",
    desc: "Triage executive emails, manage sprint backlog, and design checkout A/B experiments.",
  },
  {
    id: "data",
    title: "Data & Analytics",
    icon: "📊",
    accent: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4, #0284c7)",
    desc: "Investigate why DAU dropped 18% using SQL, repair failing ETL DAGs, and build BI reports.",
  },
  {
    id: "sre",
    title: "SRE & Incident Ops",
    icon: "🚨",
    accent: "#ef4444",
    gradient: "linear-gradient(135deg, #ef4444, #b91c1c)",
    desc: "Take command of an active Sev-1 war room, diagnose 42% 5xx errors, and execute a 1-click rollback.",
  },
  {
    id: "support",
    title: "Customer Support",
    icon: "🎧",
    accent: "#10b981",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    desc: "Resolve 120-ticket backlog, inspect payment ledger, and execute unified batch escalation.",
  },
  {
    id: "brand",
    title: "Brand & Social Crisis",
    icon: "📱",
    accent: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899, #be185d)",
    desc: "Defuse a viral social backlash, compose executive statements, and swing public sentiment positive.",
  },
];

export default function SelectDomainPage() {
  const router = useRouter();
  const [selectedDomain, setSelectedDomain] = useState<string>("engineering");
  const [selectedSubEnv, setSelectedSubEnv] = useState<number>(1);

  const activeScopeDef = SCOPE_DEFINITIONS[selectedDomain] || SCOPE_DEFINITIONS.engineering;

  const handleLaunch = (domainId: string, subEnvNum: number = 1) => {
    router.push(`/seeker/dashboard?domain=${domainId}&subEnv=${subEnvNum}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#05070d", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      {/* Background glow */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "20%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", filter: "blur(120px)" }} />
      </div>

      {/* Back nav */}
      <div style={{ position: "relative", zIndex: 1, padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to Home
        </button>
        <div style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", border: "1px solid #f59e0b40", padding: "3px 8px", borderRadius: 4, background: "rgba(245,158,11,0.1)" }}>
          ⚡ AURA COMMERCE // 7 SCOPES × 3 SUB-ENVIRONMENTS (21 ARENAS)
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "10px 24px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
            [ STEP 1 // WORKPLACE DOMAIN & SUB-ENVIRONMENT SELECTION ]
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Choose Your Operational Arena
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, maxWidth: 700, marginInline: "auto" }}>
            Select any of the 7 professional scopes. Each scope contains 3 dedicated, fully interactive sub-environments with authentic software tools, real data, and real-time 3D observer telemetry.
          </p>
        </div>

        {/* 7 Domain Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 28 }}>
          {DOMAIN_CARDS.map((card) => {
            const isSelected = selectedDomain === card.id;
            return (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedDomain(card.id);
                  setSelectedSubEnv(1);
                }}
                style={{
                  padding: "14px 10px",
                  borderRadius: 8,
                  border: `2px solid ${isSelected ? card.accent : "rgba(255,255,255,0.08)"}`,
                  background: isSelected ? "rgba(255,255,255,0.06)" : "#0b101c",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 24 }}>{card.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: isSelected ? card.accent : "#fff" }}>
                  {card.title}
                </span>
                <span style={{ fontSize: 10, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                  3 Sub-Envs
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Domain Showcase & 3 Sub-Environments */}
        <div
          style={{
            background: "#0a0f1d",
            border: `1px solid ${activeScopeDef.accent}40`,
            borderRadius: 12,
            padding: 28,
            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 20px ${activeScopeDef.accent}15`,
          }}
        >
          {/* Active Scope Title Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: activeScopeDef.accent, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
                SCOPE: {activeScopeDef.label.toUpperCase()} // PROJECT STATEMENT
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 6px" }}>
                {activeScopeDef.projectTitle}
              </h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, maxWidth: 800 }}>
                {activeScopeDef.projectOverview}
              </p>
            </div>
            <button
              onClick={() => handleLaunch(selectedDomain, selectedSubEnv)}
              style={{
                padding: "12px 24px",
                background: activeScopeDef.accent,
                color: "#000",
                fontWeight: 900,
                fontSize: 12,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              LAUNCH SCOPE ▶
            </button>
          </div>

          {/* 3 Sub-Environments Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {activeScopeDef.subEnvironments.map((sub) => {
              const isSubSelected = selectedSubEnv === sub.subEnv;
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubEnv(sub.subEnv)}
                  style={{
                    padding: 20,
                    borderRadius: 10,
                    border: `1.5px solid ${isSubSelected ? activeScopeDef.accent : "rgba(255,255,255,0.08)"}`,
                    background: isSubSelected ? "rgba(255,255,255,0.04)" : "#070b16",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: activeScopeDef.accent, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                        SUB-ENV 0{sub.subEnv}
                      </span>
                      <span style={{ fontSize: 10, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                        {sub.envType}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                      {sub.title}
                    </h3>
                    <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, margin: "0 0 12px" }}>
                      {sub.description}
                    </p>

                    <div style={{ background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 16 }}>
                      <strong style={{ color: activeScopeDef.accent }}>Problem: </strong>
                      {sub.problemStatement}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunch(selectedDomain, sub.subEnv);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: isSubSelected ? activeScopeDef.accent : "rgba(255,255,255,0.06)",
                      color: isSubSelected ? "#000" : "#fff",
                      fontWeight: 800,
                      fontSize: 11,
                      borderRadius: 6,
                      border: `1px solid ${isSubSelected ? activeScopeDef.accent : "rgba(255,255,255,0.1)"}`,
                      cursor: "pointer",
                      fontFamily: "'JetBrains Mono', monospace",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>ENTER SUB-ENV 0{sub.subEnv}</span>
                    <span>▶</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
