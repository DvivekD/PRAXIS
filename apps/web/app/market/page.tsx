"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const mockCandidates = [
  { id: "A1", name: "J. Chen", domain: "engineering", score: 94, tags: ["Distributed Systems", "Rust"], badge: "0x8f...4c" },
  { id: "A2", name: "S. Williams", domain: "sales", score: 88, tags: ["Enterprise SaaS", "Negotiation"], badge: "0x2a...91" },
  { id: "A3", name: "M. Torres", domain: "product", score: 91, tags: ["Growth", "0-to-1"], badge: "0x1b...5f" },
  { id: "A4", name: "L. Kim", domain: "data", score: 95, tags: ["Data Pipelines", "Snowflake"], badge: "0x7c...2e" },
  { id: "A5", name: "R. Patel", domain: "engineering", score: 89, tags: ["Frontend", "React 3D"], badge: "0x4d...8a" },
  { id: "A6", name: "D. Smith", domain: "sales", score: 92, tags: ["Outbound", "FinTech"], badge: "0x9e...1b" },
];

export default function ApprenticeMarket() {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? mockCandidates : mockCandidates.filter(c => c.domain === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Inter', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #333", paddingBottom: 24, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, color: "#fff", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>[ TALENT_EXCHANGE ]</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: "uppercase", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>Apprentice Market</h1>
            <p style={{ color: "#a1a1aa", marginTop: 8, fontSize: 14 }}>Bid on or draft cryptographically-verified top 1% talent.</p>
          </div>
          
          {/* Filters */}
          <div style={{ display: "flex", gap: 8 }}>
            {["all", "engineering", "sales", "product", "data"].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 12px", background: filter === f ? "#fff" : "transparent", color: filter === f ? "#000" : "#a1a1aa",
                  border: "1px solid #333", borderRadius: 4, cursor: "pointer", textTransform: "uppercase", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {filtered.map((candidate, i) => (
            <motion.div 
              key={candidate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                border: `1px solid ${getDomainColor(candidate.domain)}50`,
                background: `linear-gradient(180deg, ${getDomainColor(candidate.domain)}10 0%, transparent 100%)`,
                padding: 24,
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Score Badge */}
              <div style={{ position: "absolute", top: 20, right: 20, fontSize: 24, fontWeight: 900, color: getDomainColor(candidate.domain), fontFamily: "'JetBrains Mono', monospace" }}>
                {candidate.score}
              </div>

              <div style={{ fontSize: 11, color: getDomainColor(candidate.domain), textTransform: "uppercase", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>{candidate.domain}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px 0" }}>{candidate.name}</h3>
              
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                {candidate.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: "4px 8px", background: "rgba(255,255,255,0.1)", borderRadius: 4 }}>{tag}</span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #333", paddingTop: 16 }}>
                <div style={{ fontSize: 10, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>
                  ZK-PROOF: <span style={{ color: "#fff" }}>{candidate.badge}</span>
                </div>
                <button style={{ background: "#fff", color: "#000", border: "none", padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
                  DRAFT
                </button>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}

function getDomainColor(domain: string) {
  switch (domain) {
    case "engineering": return "#00ff41";
    case "sales": return "#f59e0b";
    case "product": return "#818cf8";
    case "data": return "#06b6d4";
    default: return "#fff";
  }
}
